import { unlink, readFile, rename, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { Router } from 'express';
import {
	ParsedFolioSchema,
	collectBrokenLinks,
	displayNameToFilename,
	extractAllLinks,
	rewriteWikiLinks,
	serializeToMarkdown,
	validateAgainstSchema,
	type ParsedFolio,
	type ProjectSchema,
} from '@axiom-forge/shared';
import type { ProjectStore } from '../projectStore.js';
import { writeFolioFile, statFile } from '../fileIO.js';
import { writeMutex } from '../utils/mutex.js';

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
			const { mtime } = await writeFolioFile(filePath, result.content);
			store.updateMtime(filePath, mtime);
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

const exists = (store: ProjectStore) => (folder: string, name: string): boolean =>
	!!store.getRecord(folder, name);

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

	// GET /api/folios/:folder/:name/backlinks — folios linking to this one
	r.get('/:folder/:name/backlinks', (req, res) => {
		const { folder, name } = req.params;
		if (!folder || !name) {
			res.status(400).json({ error: 'Folder and name required' });
			return;
		}
		try {
			res.json(store.getBacklinks(folder, name));
		} catch (err) {
			console.error(`Error fetching backlinks for ${folder}/${name}:`, err);
			res.status(500).json({ error: 'Failed to fetch backlinks' });
		}
	});

	// PUT /api/folios/:folder/:name — save an existing folio.
	// If the H1 changes the file is renamed atomically and every wiki-link
	// across the project is rewritten to point at the new filename.
	r.put('/:folder/:name', async (req, res) => {
		const { folder, name } = req.params;
		try {
			await writeMutex.runExclusive(async () => {
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
				// 5 ms of slop absorbs Node's `mtimeMs` float-rounding on Windows
				// (mtime is stored as Windows FILETIME, converted to JS float ms).
				if (Math.abs(fileStat.mtime - body.clientMtime) > 5) {
					res.status(409).json({ error: 'conflict', serverMtime: fileStat.mtime });
					return;
				}

				const newName = displayNameToFilename(body.folio.title);
				if (!newName) {
					res.status(400).json({ error: 'invalid-title', reason: 'empty-after-sanitization' });
					return;
				}

				const folderPath = resolve(store.projectPath, folder!);
				const oldName = record.name;
				const oldFilePath = record.filePath;
				const isRename = newName !== oldName;

				if (isRename && store.getRecord(folder!, newName)) {
					res.status(409).json({ error: 'exists', name: newName });
					return;
				}

				// 1. Write updated content to the *current* path atomically.
				//    writeFolioFile uses tmp+rename internally; if it fails, the
				//    old file is untouched.
				const folioToWrite: ParsedFolio = { ...body.folio, name: isRename ? newName : oldName };
				const markdown = serializeToMarkdown(folioToWrite, schema);
				await writeFolioFile(oldFilePath, markdown);

				let filePath = oldFilePath;
				let renamedTo: string | undefined;
				let linksRewritten = 0;

				// 2. Atomic move to the new path. If this fails, the in-place
				//    write above already succeeded; the save is consistent at
				//    the old name and we surface the rename failure.
				if (isRename) {
					filePath = join(folderPath, `${newName}.md`);
					try {
						await rename(oldFilePath, filePath);
					} catch (err) {
						console.error(`Rename failed ${oldFilePath} -> ${filePath}:`, err);
						res.status(500).json({ error: 'rename-failed', reason: String(err) });
						return;
					}
					const renamedStat = await stat(filePath);
					store.renameFolioRecord(folder!, oldName, newName, filePath, renamedStat.mtimeMs);

					// 3. Best-effort project-wide link rewrite. If this fails partway
					//    the index and primary file are already consistent — only
					//    other files' wikilinks may be stale.
					try {
						linksRewritten = await rewriteProjectLinks(store, folder!, oldName, newName, filePath);
					} catch (err) {
						console.error(`Partial link rewrite after rename ${oldName} -> ${newName}:`, err);
						res.status(500).json({
							error: 'link-rewrite-failed',
							reason: String(err),
							renamedTo: newName,
						});
						return;
					}
					renamedTo = newName;
				}

				// Update index from the validated in-memory folio — no re-read needed.
				const finalStat = await stat(filePath);
				const snippet = store.deriveSnippet(folioToWrite);
				store.updateFolioRecord(folder!, renamedTo ?? oldName, {
					mtime: finalStat.mtimeMs,
					title: folioToWrite.title,
					tags: folioToWrite.tags,
					aliases: folioToWrite.aliases,
					snippet,
					links: extractAllLinks(folioToWrite),
				});

				const brokenLinks = collectBrokenLinks(folioToWrite, exists(store));

				res.json({
					mtime: finalStat.mtimeMs,
					warnings: [],
					brokenLinks,
					...(renamedTo ? { renamedTo, linksRewritten } : {}),
				});
			});
		} catch (err) {
			console.error(`Error saving folio ${folder}/${name}:`, err);
			if (!res.headersSent) {
				res.status(500).json({ error: 'Failed to save folio' });
			}
		}
	});

	// POST /api/folios/:folder — create a new folio
	r.post('/:folder', async (req, res) => {
		const { folder } = req.params;
		try {
			await writeMutex.runExclusive(async () => {
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

				const folioToWrite: ParsedFolio = { ...body.folio, name: filename };
				const folderPath = resolve(store.projectPath, folder!);
				const filePath = join(folderPath, `${filename}.md`);
				const markdown = serializeToMarkdown(folioToWrite, schema);
				const { mtime } = await writeFolioFile(filePath, markdown);
				const snippet = store.deriveSnippet(folioToWrite);
				store.addFolioRecord({
					type: typeKey,
					folder: folder!,
					name: filename,
					title: folioToWrite.title || filename,
					filePath,
					mtime,
					tags: folioToWrite.tags,
					aliases: folioToWrite.aliases,
					snippet,
					warnings: [],
					links: extractAllLinks(folioToWrite),
				});
				const brokenLinks = collectBrokenLinks(folioToWrite, exists(store));
				res.status(201).json({
					name: filename,
					mtime,
					warnings: [],
					brokenLinks,
				});
			});
		} catch (err) {
			console.error(`Error creating folio in ${folder}:`, err);
			if (!res.headersSent) {
				res.status(500).json({ error: 'Failed to create folio' });
			}
		}
	});

	// DELETE /api/folios/:folder/:name — delete a folio
	r.delete('/:folder/:name', async (req, res) => {
		const { folder, name } = req.params;
		try {
			await writeMutex.runExclusive(async () => {
				const record = store.getRecord(folder!, name!);
				if (!record) {
					res.status(404).json({ error: 'Folio not found' });
					return;
				}
				await unlink(record.filePath);
				store.removeFolioRecord(folder!, name!);
				res.json({ ok: true });
			});
		} catch (err) {
			console.error(`Error deleting folio ${folder}/${name}:`, err);
			if (!res.headersSent) {
				res.status(500).json({ error: 'Failed to delete folio' });
			}
		}
	});

	return r;
}
