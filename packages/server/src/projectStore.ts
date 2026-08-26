import { readFile, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import {
	ConfigSchema,
	ProjectSchemaSchema,
	ParsedFolioSchema,
	collectBrokenLinks,
	displayNameToFilename,
	extractAllLinks,
	filenameToDisplayName,
	parseMarkdown,
	rankFolios,
	rewriteWikiLinks,
	serializeToMarkdown,
	validateAgainstSchema,
	type Config,
	type ProjectSchema,
	type FolioIndexRecord,
	type ParsedFolio,
	type WikiLink,
} from '@axiom-forge/shared';
import {
	scanFolder,
	readFolioFile,
	writeFolioFile,
	renameFolioFile,
	deleteFolioFile,
	statFile,
} from './fileIO.js';
import { Mutex } from './utils/mutex.js';
import {
	ValidationError,
	NotFoundError,
	BadRequestError,
	InvalidTitleError,
	ConflictError,
	RenameFailedError,
	LinkRewriteFailedError,
} from './storeErrors.js';

/** Payload returned by saveFolio (mirrors the PUT response body). */
export interface SaveResult {
	mtime: number;
	warnings: string[];
	brokenLinks: ReturnType<typeof collectBrokenLinks>;
	renamedTo?: string;
	linksRewritten?: number;
}

/** Payload returned by createFolio (mirrors the POST response body). */
export interface CreateResult {
	name: string;
	mtime: number;
	warnings: string[];
	brokenLinks: ReturnType<typeof collectBrokenLinks>;
}

interface InternalFolioRecord extends FolioIndexRecord {
	filePath: string;
	mtime: number;
	warnings: string[];
	links: WikiLink[];
}

export class ProjectStore {
	private config: Config | null = null;
	private schema: ProjectSchema | null = null;
	private folios: InternalFolioRecord[] = [];
	private nextId = 1;
	/** Serializes all mutating operations so concurrent writes can't interleave. */
	private readonly writeMutex = new Mutex();

	constructor(public readonly projectPath: string) {}

	async load(): Promise<void> {
		const dirStat = await stat(this.projectPath).catch(() => null);
		if (!dirStat || !dirStat.isDirectory()) {
			throw new Error(`Project path is not a directory: ${this.projectPath}`);
		}

		this.config = await this.loadJson('config.json', ConfigSchema.parse);
		this.schema = await this.loadJson('schema.json', ProjectSchemaSchema.parse);

		console.log(
			`  • config: "${this.config.name}"`,
		);
		console.log(
			`  • schema: ${Object.keys(this.schema.types).length} types ` +
				`(${Object.keys(this.schema.types).join(', ')})`,
		);

		await this.buildFolioIndex();
	}

	getConfig(): Config {
		if (!this.config) throw new Error('ProjectStore not loaded.');
		return this.config;
	}

	getSchema(): ProjectSchema {
		if (!this.schema) throw new Error('ProjectStore not loaded.');
		return this.schema;
	}

	/** Return all folio index records (for the sidebar). */
	getFolios(): FolioIndexRecord[] {
		return this.folios.map(({ filePath: _f, mtime: _m, ...rest }) => rest);
	}

	/** Return folios filtered by type key (e.g. "Character"). */
	getFoliosByType(typeKey: string): FolioIndexRecord[] {
		return this.getFolios().filter((f) => f.type === typeKey);
	}

	/** Return all folios that link to a specific target. */
	getBacklinks(targetFolder: string, targetName: string): FolioIndexRecord[] {
		return this.folios
			.filter((f) => f.links.some((l) => l.folder === targetFolder && l.name === targetName))
			.map(({ filePath: _f, mtime: _m, links: _l, ...rest }) => rest);
	}

	/** Look up the internal record (incl. filePath, mtime). */
	getRecord(folder: string, name: string): InternalFolioRecord | undefined {
		return this.folios.find((f) => f.folder === folder && f.name === name);
	}

	/** Return every folio's filePath — used by the wikilink rewriter (M4). */
	getAllFilePaths(): string[] {
		return this.folios.map((f) => f.filePath);
	}

	/** Return all parse warnings across the project, grouped by folio. */
	getWarnings(): { folder: string; name: string; warnings: string[] }[] {
		return this.folios
			.filter((f) => f.warnings.length > 0)
			.map(({ folder, name, warnings }) => ({ folder, name, warnings }));
	}

	/**
	 * Search the folio index by free-text query, returning the top 20 matches.
	 *
	 * Ranking itself lives in `rankFolios` in `@axiom-forge/shared` (ADR-0011) so
	 * the client's index views score identically. This method owns only the
	 * project-index source and the result limit.
	 */
	search(query: string): FolioIndexRecord[] {
		return rankFolios(this.getFolios(), query).slice(0, 20);
	}

	/** Add a new folio record, assign the next ID, and re-sort alphabetically. */
	addFolioRecord(record: Omit<InternalFolioRecord, 'id'>): InternalFolioRecord {
		const full: InternalFolioRecord = { ...record, id: this.nextId++ };
		this.folios.push(full);
		this.folios.sort((a, b) => a.name.localeCompare(b.name));
		return full;
	}

	/** Remove a folio record from the in-memory index. */
	removeFolioRecord(folder: string, name: string): void {
		const idx = this.folios.findIndex((f) => f.folder === folder && f.name === name);
		if (idx !== -1) this.folios.splice(idx, 1);
	}

	/**
	 * Rename an existing folio record in place — preserves `id` so wiki-links
	 * and any external references to the numeric folio number stay valid.
	 * The on-disk rename is handled separately by `fileIO.renameFolioFile`.
	 */
	renameFolioRecord(
		folder: string,
		oldName: string,
		newName: string,
		newFilePath: string,
		newMtime: number,
	): void {
		const record = this.folios.find((f) => f.folder === folder && f.name === oldName);
		if (!record) return;
		record.name = newName;
		record.filePath = newFilePath;
		record.mtime = newMtime;
		// Keep the index alphabetical so consumers (sidebar) don't have to re-sort.
		this.folios.sort((a, b) => a.name.localeCompare(b.name));
	}

	/** Update the cached mtime for a file path — used after batch wikilink rewrites. */
	updateMtime(filePath: string, mtime: number): void {
		const record = this.folios.find((f) => f.filePath === filePath);
		if (record) record.mtime = mtime;
	}

	/**
	 * Update an existing folio's index record in place, after a save.
	 * Re-derives the snippet from the new prose content.
	 */
	updateFolioRecord(
		folder: string,
		name: string,
		patch: { mtime: number; title?: string; tags: string[]; aliases?: string[]; snippet?: string; warnings?: string[]; links: WikiLink[] },
	): void {
		const record = this.folios.find((f) => f.folder === folder && f.name === name);
		if (!record) return;
		record.mtime = patch.mtime;
		if (patch.title !== undefined) record.title = patch.title;
		record.tags = patch.tags;
		record.aliases = patch.aliases;
		record.snippet = patch.snippet;
		if (patch.warnings !== undefined) record.warnings = patch.warnings;
		record.links = patch.links;
	}

	/** Compute a snippet from a parsed folio (first paragraph of prose, ≤120 chars). */
	deriveSnippet(parsed: ParsedFolio): string | undefined {
		const typeDef = this.getSchema().types[parsed.type];
		if (!typeDef) return undefined;
		const proseSectionName = Object.entries(typeDef.sections).find(([, def]) => def.role === 'prose')?.[0];
		if (!proseSectionName) return undefined;
		const proseContent = parsed.sections[proseSectionName]?.content;
		if (!proseContent) return undefined;
		const firstParagraph = proseContent
			.split(/\n\s*\n/)
			.map((s) => s.trim().replace(/\n/g, ' '))
			.filter(Boolean)[0];
		if (!firstParagraph) return undefined;
		let text = firstParagraph.replace(/^[#*>-]+\s*/, '');
		
		// Strip wikilink syntax: [[Folder/Name|Alias]] -> Alias, [[Folder/Name]] -> Name
		text = text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, path, alias) => {
			if (alias) return alias.trim();
			const slashIdx = path.indexOf('/');
			return slashIdx !== -1 ? path.slice(slashIdx + 1).replace(/_/g, ' ').trim() : path.trim();
		});

		if (text.length > 120) {
			text = text.substring(0, 120);
			text = text.substring(0, Math.min(text.length, text.lastIndexOf(' ')));
			text = text.replace(/[\s,;:\-.]+$/, '');
			return text + '...';
		}
		return text;
	}

	/**
	 * Return a single parsed folio with full structured data.
	 * Reads the file fresh from disk each time (no content cache).
	 */
	async getFolio(folder: string, name: string): Promise<(ParsedFolio & { id: number; mtime: number }) | null> {
		const record = this.folios.find(
			(f) => f.folder === folder && f.name === name,
		);
		if (!record) return null;

		const { content, mtime } = await readFolioFile(record.filePath);
		const parsed = parseMarkdown(content, this.getSchema());
		return {
			...parsed,
			id: record.id,
			mtime,
			name: record.name,     // authoritative filename stem (ID)
			title: parsed.title || filenameToDisplayName(record.name),
			folder: record.folder, // authoritative folder from index
		};
	}

	// ── Mutations (ADR-0006) ────────────────────────────────
	// All folio writes go through these methods. Each acquires the write mutex,
	// validates, performs atomic disk I/O via fileIO, and updates the in-memory
	// index. Failures throw typed domain errors (see storeErrors.ts); the route
	// layer maps those to HTTP responses.

	/**
	 * Save an existing folio. If the H1 title changes, the file is renamed and
	 * every `[[folder/oldName]]` wikilink across the project is rewritten.
	 */
	async saveFolio(
		folder: string,
		name: string,
		folio: ParsedFolio,
		clientMtime: number,
	): Promise<SaveResult> {
		return this.writeMutex.runExclusive(async () => {
			const schema = this.getSchema();
			this.validateForWrite(folio, schema);

			const record = this.getRecord(folder, name);
			if (!record) throw new NotFoundError('Folio not found');

			const fileStat = await statFile(record.filePath);
			if (!fileStat) throw new NotFoundError('File missing on disk');
			// 5 ms of slop absorbs Node's `mtimeMs` float-rounding on Windows
			// (mtime is stored as Windows FILETIME, converted to JS float ms).
			if (Math.abs(fileStat.mtime - clientMtime) > 5) {
				throw new ConflictError({ kind: 'stale', serverMtime: fileStat.mtime });
			}

			const newName = displayNameToFilename(folio.title);
			if (!newName) throw new InvalidTitleError();

			const folderPath = resolve(this.projectPath, folder);
			const oldName = record.name;
			const oldFilePath = record.filePath;
			const isRename = newName !== oldName;

			if (isRename && this.getRecord(folder, newName)) {
				throw new ConflictError({ kind: 'exists', name: newName });
			}

			// 1. Write updated content to the *current* path atomically.
			//    writeFolioFile uses tmp+rename internally; if it fails, the
			//    old file is untouched.
			const folioToWrite: ParsedFolio = { ...folio, name: isRename ? newName : oldName };
			const markdown = serializeToMarkdown(folioToWrite, schema);
			const warnings = this.reparseWarnings(markdown, schema);
			await writeFolioFile(oldFilePath, markdown);

			let filePath = oldFilePath;
			let renamedTo: string | undefined;
			let linksRewritten = 0;

			// 2. Atomic move to the new path. If this fails, the in-place write
			//    above already succeeded; the save is consistent at the old name.
			if (isRename) {
				filePath = join(folderPath, `${newName}.md`);
				let renamedMtime: number;
				try {
					({ mtime: renamedMtime } = await renameFolioFile(oldFilePath, filePath));
				} catch (err) {
					console.error(`Rename failed ${oldFilePath} -> ${filePath}:`, err);
					throw new RenameFailedError(String(err));
				}
				this.renameFolioRecord(folder, oldName, newName, filePath, renamedMtime);

				// 3. Best-effort project-wide link rewrite. If this fails partway
				//    the index and primary file are already consistent — only
				//    other files' wikilinks may be stale.
				try {
					linksRewritten = await this.rewriteProjectLinks(folder, oldName, newName, filePath);
				} catch (err) {
					console.error(`Partial link rewrite after rename ${oldName} -> ${newName}:`, err);
					throw new LinkRewriteFailedError(String(err), newName);
				}
				renamedTo = newName;
			}

			// Update index from the validated in-memory folio — no re-read needed.
			const finalStat = await stat(filePath);
			const snippet = this.deriveSnippet(folioToWrite);
			this.updateFolioRecord(folder, renamedTo ?? oldName, {
				mtime: finalStat.mtimeMs,
				title: folioToWrite.title,
				tags: folioToWrite.tags,
				aliases: folioToWrite.aliases,
				snippet,
				warnings,
				links: extractAllLinks(folioToWrite),
			});

			const brokenLinks = collectBrokenLinks(folioToWrite, (f, n) => !!this.getRecord(f, n));

			return {
				mtime: finalStat.mtimeMs,
				warnings,
				brokenLinks,
				...(renamedTo ? { renamedTo, linksRewritten } : {}),
			};
		});
	}

	/** Create a new folio in the given folder. */
	async createFolio(folder: string, folio: ParsedFolio): Promise<CreateResult> {
		return this.writeMutex.runExclusive(async () => {
			const schema = this.getSchema();
			const typeEntry = Object.entries(schema.types).find(([, t]) => t.folder === folder);
			if (!typeEntry) throw new BadRequestError(`Unknown folder: ${folder}`);
			const [typeKey] = typeEntry;

			this.validateForWrite(folio, schema);

			const filename = displayNameToFilename(folio.title || folio.name);
			if (!filename) throw new InvalidTitleError();
			if (this.getRecord(folder, filename)) {
				throw new ConflictError({ kind: 'exists', name: filename });
			}

			const folioToWrite: ParsedFolio = { ...folio, name: filename };
			const folderPath = resolve(this.projectPath, folder);
			const filePath = join(folderPath, `${filename}.md`);
			const markdown = serializeToMarkdown(folioToWrite, schema);
			const warnings = this.reparseWarnings(markdown, schema);
			const { mtime } = await writeFolioFile(filePath, markdown);
			const snippet = this.deriveSnippet(folioToWrite);
			this.addFolioRecord({
				type: typeKey,
				folder,
				name: filename,
				title: folioToWrite.title || filename,
				filePath,
				mtime,
				tags: folioToWrite.tags,
				aliases: folioToWrite.aliases,
				snippet,
				warnings,
				links: extractAllLinks(folioToWrite),
			});
			const brokenLinks = collectBrokenLinks(folioToWrite, (f, n) => !!this.getRecord(f, n));
			return { name: filename, mtime, warnings, brokenLinks };
		});
	}

	/** Delete a folio and remove it from the index. */
	async deleteFolio(folder: string, name: string): Promise<void> {
		return this.writeMutex.runExclusive(async () => {
			const record = this.getRecord(folder, name);
			if (!record) throw new NotFoundError('Folio not found');
			await deleteFolioFile(record.filePath);
			this.removeFolioRecord(folder, name);
		});
	}

	async reload(): Promise<void> {
		this.config = await this.loadJson('config.json', ConfigSchema.parse);
		this.schema = await this.loadJson('schema.json', ProjectSchemaSchema.parse);
		this.folios = [];
		this.nextId = 1;
		await this.buildFolioIndex();
		console.log('  • project reloaded from disk');
	}

	// ── Private ─────────────────────────────────────────────

	/**
	 * Validate a folio for writing: structural shape (zod) then schema
	 * conformance (unknown sections/fields, invalid select values). Throws
	 * ValidationError on the first failing tier.
	 */
	private validateForWrite(folio: ParsedFolio, schema: ProjectSchema): void {
		const parsed = ParsedFolioSchema.safeParse(folio);
		if (!parsed.success) {
			throw new ValidationError('invalid-shape', parsed.error.issues);
		}
		const issues = validateAgainstSchema(parsed.data, schema);
		if (issues.length > 0) {
			throw new ValidationError('schema-violation', issues);
		}
	}

	/**
	 * Project-wide rewrite of `[[folder/oldName]]` (with or without `|alias`)
	 * to `[[folder/newName]]` across every file except `skipFilePath`. Returns
	 * the total number of link occurrences rewritten.
	 */
	private async rewriteProjectLinks(
		folder: string,
		oldName: string,
		newName: string,
		skipFilePath: string,
	): Promise<number> {
		let totalRewrites = 0;
		for (const filePath of this.getAllFilePaths()) {
			if (filePath === skipFilePath) continue;
			const content = await readFile(filePath, 'utf-8');
			const result = rewriteWikiLinks(content, { folder, name: oldName }, { name: newName });
			if (result.rewrites > 0) {
				const { mtime } = await writeFolioFile(filePath, result.content);
				this.updateMtime(filePath, mtime);
				totalRewrites += result.rewrites;
			}
		}
		return totalRewrites;
	}

	/**
	 * Re-parse just-serialized markdown to surface any parse warnings the
	 * round-trip produces. Input was validated before write, so in practice
	 * this is empty — a non-empty result signals serializer/parser drift. A
	 * throw is downgraded to a warning so the already-written save still
	 * returns consistently.
	 */
	private reparseWarnings(markdown: string, schema: ProjectSchema): string[] {
		try {
			return parseMarkdown(markdown, schema).warnings ?? [];
		} catch (err) {
			return [`Failed to re-parse after save: ${err instanceof Error ? err.message : String(err)}`];
		}
	}

	private async buildFolioIndex(): Promise<void> {
		const schema = this.getSchema();
		const allFiles: { typeKey: string; folder: string; file: Awaited<ReturnType<typeof scanFolder>>[number] }[] = [];

		for (const [typeKey, typeDef] of Object.entries(schema.types)) {
			const folderPath = resolve(this.projectPath, typeDef.folder);
			const files = await scanFolder(folderPath);
			for (const file of files) {
				allFiles.push({ typeKey, folder: typeDef.folder, file });
			}
		}

		// Sort alphabetically by name.
		allFiles.sort((a, b) => a.file.name.localeCompare(b.file.name));

		// Assign IDs and parse Meta blocks for tags/snippet.
		this.folios = [];
		let id = 1;
		for (const { typeKey, folder, file } of allFiles) {
			let tags: string[] = [];
			let aliases: string[] | undefined;
			let snippet: string | undefined;
			let warnings: string[];
			let links: WikiLink[] = [];
			let title = filenameToDisplayName(file.name);
			try {
				const { content } = await readFolioFile(file.filePath);
				const parsed = parseMarkdown(content, schema);
				tags = parsed.tags;
				aliases = parsed.aliases;
				warnings = parsed.warnings ?? [];
				if (parsed.title) title = parsed.title;
				snippet = this.deriveSnippet(parsed);
				links = extractAllLinks(parsed);
			} catch (err) {
				warnings = [`Failed to parse: ${err instanceof Error ? err.message : String(err)}`];
			}
			this.folios.push({
				id: id++,
				type: typeKey,
				folder,
				name: file.name,
				title,
				filePath: file.filePath,
				mtime: file.mtime,
				tags,
				aliases,
				snippet,
				warnings,
				links,
			});
		}
		this.nextId = id;

		console.log(`  • indexed ${this.folios.length} folios`);
	}

	private async loadJson<T>(
		relPath: string,
		validate: (raw: unknown) => T,
	): Promise<T> {
		const fullPath = resolve(this.projectPath, relPath);
		let raw: string;
		try {
			raw = await readFile(fullPath, 'utf-8');
		} catch {
			throw new Error(`Missing required file: ${fullPath}`);
		}
		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch (err) {
			throw new Error(`Invalid JSON in ${fullPath}: ${(err as Error).message}`, { cause: err });
		}
		try {
			return validate(parsed);
		} catch (err) {
			throw new Error(`Schema validation failed for ${fullPath}:\n${(err as Error).message}`, {
				cause: err,
			});
		}
	}
}
