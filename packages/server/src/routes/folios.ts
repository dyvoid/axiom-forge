import { unlink, readFile, writeFile, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { Router } from 'express';
import {
	ParsedFolioSchema,
	displayNameToFilename,
	parseMarkdown,
	rewriteWikiLinks,
	serializeToMarkdown,
	validateAgainstSchema,
	type ParsedFolio,
	type ProjectSchema,
} from '@axiom-forge/shared';
import type { ProjectStore } from '../projectStore.js';
import { writeFolioFile, statFile } from '../fileIO.js';

// ── Brokenlink walker ────────────────────────────────────────
// Schema-agnostic: walks whatever sections/fields are populated in the
// supplied folio and asks the store whether each wiki-link target exists.

interface BrokenLink {
	section: string;
	/** Undefined for top-level wikilink-list sections (no inner field name). */
	field?: string;
	folder: string;
	name: string;
}

function isWikiLink(v: unknown): v is { folder: string; name: string } {
	return !!v && typeof v === 'object' && 'folder' in v && 'name' in v
		&& typeof (v as Record<string, unknown>).folder === 'string'
		&& typeof (v as Record<string, unknown>).name === 'string';
}

function collectBrokenLinks(
	folio: ParsedFolio,
	store: ProjectStore,
): BrokenLink[] {
	const out: BrokenLink[] = [];
	const exists = (folder: string, name: string): boolean => !!store.getRecord(folder, name);

	for (const [sectionName, section] of Object.entries(folio.sections)) {
		// Section-level value (e.g. a top-level wikilink-list section)
		if (Array.isArray(section.value)) {
			for (const v of section.value) {
				if (isWikiLink(v) && !exists(v.folder, v.name)) {
					out.push({ section: sectionName, folder: v.folder, name: v.name });
				}
			}
		} else if (isWikiLink(section.value)) {
			if (!exists(section.value.folder, section.value.name)) {
				out.push({ section: sectionName, folder: section.value.folder, name: section.value.name });
			}
		}
		// Field-level values
		if (section.fields) {
			for (const [fieldName, value] of Object.entries(section.fields)) {
				if (Array.isArray(value)) {
					for (const v of value) {
						if (isWikiLink(v) && !exists(v.folder, v.name)) {
							out.push({ section: sectionName, field: fieldName, folder: v.folder, name: v.name });
						}
					}
				} else if (isWikiLink(value)) {
					if (!exists(value.folder, value.name)) {
						out.push({ section: sectionName, field: fieldName, folder: value.folder, name: value.name });
					}
				}
			}
		}
	}
	return out;
}

// ── Rename helper ────────────────────────────────────────────

/**
 * Perform a project-wide rewrite of `[[folder/oldName]]` (with or without
 * `|alias`) to `[[folder/newName]]` across every other file in the index.
 * Returns the total number of link occurrences rewritten.
 */
async function rewriteProjectLinks(
	store: ProjectStore,
	folder: string,
	oldName: string,
	newName: string,
	skipFilePath: string,
): Promise<number> {
	let totalRewrites = 0;
	for (const filePath of store.getAllFilePaths()) {
		if (filePath === skipFilePath) continue;
		const content = await readFile(filePath, 'utf-8');
		const result = rewriteWikiLinks(content, { folder, name: oldName }, { name: newName });
		if (result.rewrites > 0) {
			await writeFile(filePath, result.content, 'utf-8');
			const stats = await stat(filePath);
			store.updateMtime(filePath, stats.mtimeMs);
			totalRewrites += result.rewrites;
		}
	}
	return totalRewrites;
}

// ── Save validation helper (shared by PUT and POST) ──────────

interface ValidationFailure {
	status: 400;
	body: { error: string; issues: unknown };
}

function validateSaveBody(
	folio: unknown,
	schema: ProjectSchema,
): ValidationFailure | null {
	// 1. Structural shape (zod).
	const parsed = ParsedFolioSchema.safeParse(folio);
	if (!parsed.success) {
		return {
			status: 400,
			body: { error: 'invalid-shape', issues: parsed.error.issues },
		};
	}
	// 2. Schema conformance (unknown sections/fields, invalid select values).
	const issues = validateAgainstSchema(parsed.data, schema);
	if (issues.length > 0) {
		return {
			status: 400,
			body: { error: 'schema-violation', issues },
		};
	}
	return null;
}

// ── Router ───────────────────────────────────────────────────

export function foliosRouter(store: ProjectStore): Router {
	const r = Router();

	// GET /api/folios — all folio index records (for sidebar)
	r.get('/', (_req, res) => {
		res.json(store.getFolios());
	});

	// GET /api/folios/:folder/:name — single parsed folio
	r.get('/:folder/:name', async (req, res) => {
		const { folder, name } = req.params;
		try {
			const folio = await store.getFolio(folder!, name!);
			if (!folio) {
				res.status(404).json({ error: 'Folio not found' });
				return;
			}
			res.json(folio);
		} catch (err) {
			console.error(`Error reading folio ${folder}/${name}:`, err);
			res.status(500).json({ error: 'Failed to read folio' });
		}
	});

	// PUT /api/folios/:folder/:name — save an existing folio.
	// May rename the file if the H1 changes; rewrites every wiki-link
	// across the project to point at the new filename.
	r.put('/:folder/:name', async (req, res) => {
		const { folder, name } = req.params;
		const body = req.body as { folio?: ParsedFolio; clientMtime?: number };

		if (!body || typeof body !== 'object' || !body.folio || typeof body.clientMtime !== 'number') {
			res.status(400).json({ error: 'Body must be { folio, clientMtime }' });
			return;
		}

		const schema = store.getSchema();
		const validation = validateSaveBody(body.folio, schema);
		if (validation) {
			res.status(validation.status).json(validation.body);
			return;
		}

		const record = store.getRecord(folder!, name!);
		if (!record) {
			res.status(404).json({ error: 'Folio not found' });
			return;
		}

		const fileStat = await statFile(record.filePath);
		if (!fileStat) {
			res.status(404).json({ error: 'File missing on disk' });
			return;
		}
		// 5 ms of slop tolerates NTFS-class filesystems. If the project is ever
		// stored on a FAT-class FS (2 s resolution), this would need raising.
		if (Math.abs(fileStat.mtime - body.clientMtime) > 5) {
			res.status(409).json({ error: 'conflict', serverMtime: fileStat.mtime });
			return;
		}

		try {
			// Derive the desired filename from the new title.
			const newName = displayNameToFilename(body.folio.title);
			if (!newName) {
				res.status(400).json({ error: 'invalid-title', reason: 'empty-after-sanitization' });
				return;
			}

			const folderPath = resolve(store.projectPath, folder!);
			let renamedTo: string | undefined;
			let linksRewritten = 0;
			let filePath = record.filePath;

			if (newName !== record.name) {
				// Snapshot the old name *before* any mutation — `renameFolioRecord`
				// mutates record.name in place.
				const oldName = record.name;
				const oldFilePath = record.filePath;

				// Collision check — refuse to overwrite a sibling.
				if (store.getRecord(folder!, newName)) {
					res.status(409).json({ error: 'exists', name: newName });
					return;
				}
				filePath = join(folderPath, `${newName}.md`);
				const folioToWrite: ParsedFolio = { ...body.folio, name: newName };
				const markdown = serializeToMarkdown(folioToWrite, schema);

				// 1. Write the new file. 2. Unlink the old. (Write-new-first
				//    keeps the worst-case state as a duplicate file rather
				//    than data loss.)
				await writeFile(filePath, markdown, 'utf-8');
				await unlink(oldFilePath);

				// 3. Update the index *before* rewriting links — otherwise the
				//    rewriter would still see the (now-deleted) old filePath in
				//    store.getAllFilePaths() and try to read it.
				const newStats = await stat(filePath);
				store.renameFolioRecord(folder!, oldName, newName, filePath, newStats.mtimeMs);

				// 4. Rewrite every other file in the project — skip the file
				//    we just wrote.
				linksRewritten = await rewriteProjectLinks(
					store,
					folder!,
					oldName,
					newName,
					filePath,
				);

				renamedTo = newName;
			} else {
				// No rename — same path, in-place write.
				const markdown = serializeToMarkdown(body.folio, schema);
				const { mtime } = await writeFolioFile(record.filePath, markdown);
				store.updateFolioRecord(folder!, name!, {
					mtime,
					tags: body.folio.tags,
					title: body.folio.title,
				});
			}

			// Re-read for warnings + snippet + brokenLinks
			const fresh = await readFile(filePath, 'utf-8');
			const reparsed = parseMarkdown(fresh, schema);
			const finalStats = await stat(filePath);
			const snippet = store.deriveSnippet(reparsed);
			store.updateFolioRecord(folder!, renamedTo ?? name!, {
				mtime: finalStats.mtimeMs,
				title: reparsed.title,
				tags: reparsed.tags,
				snippet,
			});

			const brokenLinks = collectBrokenLinks(reparsed, store);

			res.json({
				mtime: finalStats.mtimeMs,
				warnings: reparsed.warnings ?? [],
				brokenLinks,
				...(renamedTo ? { renamedTo, linksRewritten } : {}),
			});
		} catch (err) {
			console.error(`Error saving folio ${folder}/${name}:`, err);
			res.status(500).json({ error: 'Failed to save folio' });
		}
	});

	// POST /api/folios/:folder — create a new folio
	r.post('/:folder', async (req, res) => {
		const { folder } = req.params;
		const body = req.body as { folio?: ParsedFolio };

		if (!body?.folio) {
			res.status(400).json({ error: 'Body must be { folio }' });
			return;
		}

		const schema = store.getSchema();
		const typeEntry = Object.entries(schema.types).find(([, t]) => t.folder === folder);
		if (!typeEntry) {
			res.status(400).json({ error: `Unknown folder: ${folder}` });
			return;
		}
		const [typeKey] = typeEntry;

		const validation = validateSaveBody(body.folio, schema);
		if (validation) {
			res.status(validation.status).json(validation.body);
			return;
		}

		const filename = displayNameToFilename(body.folio.title || body.folio.name);
		if (!filename) {
			res.status(400).json({ error: 'invalid-title', reason: 'empty-after-sanitization' });
			return;
		}
		if (store.getRecord(folder!, filename)) {
			res.status(409).json({ error: 'exists', name: filename });
			return;
		}

		// The folio body has the user-supplied title; the filename is derived.
		const folioToWrite: ParsedFolio = { ...body.folio, name: filename };

		const folderPath = resolve(store.projectPath, folder!);
		const filePath = join(folderPath, `${filename}.md`);

		try {
			const markdown = serializeToMarkdown(folioToWrite, schema);
			const { mtime } = await writeFolioFile(filePath, markdown);
			const reparsed = parseMarkdown(markdown, schema);
			const snippet = store.deriveSnippet(reparsed);
			store.addFolioRecord({
				type: typeKey,
				folder: folder!,
				name: filename,
				title: reparsed.title || filename,
				filePath,
				mtime,
				tags: reparsed.tags,
				snippet,
				warnings: reparsed.warnings ?? [],
			});
			const brokenLinks = collectBrokenLinks(reparsed, store);
			res.status(201).json({
				name: filename,
				mtime,
				warnings: reparsed.warnings ?? [],
				brokenLinks,
			});
		} catch (err) {
			console.error(`Error creating folio ${folder}/${filename}:`, err);
			res.status(500).json({ error: 'Failed to create folio' });
		}
	});

	// DELETE /api/folios/:folder/:name — delete a folio
	r.delete('/:folder/:name', async (req, res) => {
		const { folder, name } = req.params;
		const record = store.getRecord(folder!, name!);
		if (!record) {
			res.status(404).json({ error: 'Folio not found' });
			return;
		}
		try {
			await unlink(record.filePath);
			store.removeFolioRecord(folder!, name!);
			res.json({ ok: true });
		} catch (err) {
			console.error(`Error deleting folio ${folder}/${name}:`, err);
			res.status(500).json({ error: 'Failed to delete folio' });
		}
	});

	return r;
}
