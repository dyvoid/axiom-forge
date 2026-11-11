import { readFile, stat } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import {
	ConfigSchema,
	ProjectSchemaSchema,
	ParsedFolioSchema,
	collectBrokenLinks,
	createSchemaIndex,
	displayNameToFilename,
	extractAllLinks,
	filenameToDisplayName,
	parseMarkdown,
	parseTheme,
	rankFolios,
	rewriteWikiLinks,
	serializeToMarkdown,
	validateAgainstSchema,
	type Config,
	type CoverImage,
	type ProjectSchema,
	type SchemaIndex,
	type Theme,
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
	deleteImageFile,
	isSameFile,
	resolveImageFile,
	statFile,
	writeProjectImage,
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

/**
 * Everything `load`/`reload` read from disk. Assembled in full before any of
 * it replaces the live state, so a reload that fails partway — a bad
 * schema.json, an unreadable folder — leaves the previous project serving
 * untouched, and readers never see a half-built index.
 */
interface ProjectSnapshot {
	config: Config;
	schema: ProjectSchema;
	schemaIndex: SchemaIndex;
	theme: Theme;
	themeWarnings: string[];
	folios: InternalFolioRecord[];
}

/** One verified, not-yet-written file in a batched link rewrite (ADR-0010). */
interface PlannedLinkRewrite {
	filePath: string;
	content: string;
	rewrites: number;
}

/** The public shape of an index record: no file path, mtime, warnings or outgoing links. */
function toIndexRecord({ filePath: _f, mtime: _m, warnings: _w, links: _l, ...record }: InternalFolioRecord): FolioIndexRecord {
	return record;
}

export class ProjectStore {
	private config: Config | null = null;
	private schema: ProjectSchema | null = null;
	private schemaIndex: SchemaIndex | null = null;
	/** From the optional theme.json (ADR-0001); `{}` when absent or unusable. */
	private theme: Theme = {};
	private themeWarnings: string[] = [];
	private folios: InternalFolioRecord[] = [];
	private nextId = 1;
	/** Serializes all mutating operations so concurrent writes can't interleave. */
	private readonly writeMutex = new Mutex();

	constructor(public readonly projectPath: string) {}

	async load(): Promise<void> {
		const snapshot = await this.readProject();
		this.install(snapshot);

		console.log(
			`  • config: "${snapshot.config.name}"`,
		);
		console.log(
			`  • schema: ${Object.keys(snapshot.schema.types).length} types ` +
				`(${Object.keys(snapshot.schema.types).join(', ')})`,
		);
	}

	getConfig(): Config {
		if (!this.config) throw new Error('ProjectStore not loaded.');
		return this.config;
	}

	getSchema(): ProjectSchema {
		if (!this.schema) throw new Error('ProjectStore not loaded.');
		return this.schema;
	}

	getSchemaIndex(): SchemaIndex {
		if (!this.schemaIndex) throw new Error('ProjectStore not loaded.');
		return this.schemaIndex;
	}

	/** The validated theme.json, or `{}` when the project has none. */
	getTheme(): Theme {
		return this.theme;
	}

	/** Return all folio index records (for the sidebar). */
	getFolios(): FolioIndexRecord[] {
		return this.folios.map(toIndexRecord);
	}

	/** Return folios filtered by type key (e.g. "Character"). */
	getFoliosByType(typeKey: string): FolioIndexRecord[] {
		return this.getFolios().filter((f) => f.type === typeKey);
	}

	/** Return all folios that link to a specific target. */
	getBacklinks(targetFolder: string, targetName: string): FolioIndexRecord[] {
		return this.folios
			.filter((f) => f.links.some((l) => l.folder === targetFolder && l.name === targetName))
			.map(toIndexRecord);
	}

	/** Look up the internal record (incl. filePath, mtime). */
	getRecord(folder: string, name: string): InternalFolioRecord | undefined {
		return this.folios.find((f) => f.folder === folder && f.name === name);
	}

	/** Return every folio's filePath — used by the wikilink rewriter (M4). */
	getAllFilePaths(): string[] {
		return this.folios.map((f) => f.filePath);
	}

	/**
	 * Return all parse warnings across the project, grouped by file. theme.json
	 * problems come first, as an entry with an empty `folder` because the file
	 * sits in the project root.
	 */
	getWarnings(): { folder: string; name: string; warnings: string[] }[] {
		const themeEntry = this.themeWarnings.length > 0
			? [{ folder: '', name: 'theme.json', warnings: this.themeWarnings }]
			: [];
		return [
			...themeEntry,
			...this.folios
				.filter((f) => f.warnings.length > 0)
				.map(({ folder, name, warnings }) => ({ folder, name, warnings })),
		];
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
		patch: { mtime: number; title?: string; tags: string[]; aliases?: string[]; coverImage?: CoverImage; snippet?: string; warnings?: string[]; links: WikiLink[] },
	): void {
		const record = this.folios.find((f) => f.folder === folder && f.name === name);
		if (!record) return;
		record.mtime = patch.mtime;
		if (patch.title !== undefined) record.title = patch.title;
		record.tags = patch.tags;
		record.aliases = patch.aliases;
		record.coverImage = patch.coverImage;
		record.snippet = patch.snippet;
		if (patch.warnings !== undefined) record.warnings = patch.warnings;
		record.links = patch.links;
	}

	/** Compute a snippet from a parsed folio (first paragraph of prose, ≤120 chars). */
	deriveSnippet(parsed: ParsedFolio, schemaIndex: SchemaIndex = this.getSchemaIndex()): string | undefined {
		const prose = schemaIndex.proseSection(parsed.type);
		if (!prose) return undefined;
		const proseContent = parsed.sections[prose.name]?.content;
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
			// Cut back to a word boundary when there is one; a run with no spaces
			// (a URL, or a script written without them) keeps the hard cut.
			const lastSpace = text.lastIndexOf(' ');
			if (lastSpace > 0) text = text.substring(0, lastSpace);
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
		parsed.warnings = [
			...(parsed.warnings ?? []),
			...(await this.locationWarnings(parsed.type, record.type, record.folder, parsed.coverImage)),
		];
		return {
			...parsed,
			id: record.id,
			mtime,
			name: record.name,     // authoritative filename stem (ID)
			title: parsed.title || filenameToDisplayName(record.name),
			folder: record.folder, // authoritative folder from index
		};
	}

	async getCoverImageFile(folder: string, name: string): Promise<string | null> {
		const record = this.getRecord(folder, name);
		if (!record?.coverImage) return null;
		const resolution = await resolveImageFile(this.projectPath, record.coverImage.path);
		return resolution.filePath ?? null;
	}

	async uploadCoverImage(folder: string, name: string, fileName: string, content: Buffer): Promise<CoverImage> {
		return this.writeMutex.runExclusive(async () => {
			if (!this.getRecord(folder, name)) throw new NotFoundError('Folio not found');
			const written = await writeProjectImage(this.projectPath, fileName, content);
			return { path: written.path, syntax: 'wikilink' };
		});
	}

	async deleteCoverImage(folder: string, name: string): Promise<void> {
		return this.writeMutex.runExclusive(async () => {
			const record = this.getRecord(folder, name);
			if (!record) throw new NotFoundError('Folio not found');
			const { content } = await readFolioFile(record.filePath);
			const coverImage = parseMarkdown(content, this.getSchema()).coverImage;
			if (!coverImage) throw new NotFoundError('Cover image not found');
			const resolution = await resolveImageFile(this.projectPath, coverImage.path);
			if (!resolution.filePath) throw new NotFoundError('Cover image not found');
			await deleteImageFile(resolution.filePath);
		});
	}

	// ── Mutations (ADR-0006) ────────────────────────────────
	// All folio writes go through these methods. Each acquires the write mutex,
	// validates, performs atomic disk I/O via fileIO, and updates the in-memory
	// index. Failures throw typed domain errors (see storeErrors.ts); the route
	// layer maps those to HTTP responses.

	/**
	 * Save an existing folio. If the display title changes, the file is renamed and
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
			this.assertTypeMatchesFolder(folio.type, record.type, folder);

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
			const newFilePath = join(folderPath, `${newName}.md`);

			if (isRename) {
				const clash = this.findNameClash(folder, newName, oldName);
				if (clash) throw new ConflictError({ kind: 'exists', name: clash.name });
				// A file created outside the app since the last index build: the
				// rename below would replace it.
				if (await statFile(newFilePath) && !(await isSameFile(oldFilePath, newFilePath))) {
					throw new ConflictError({ kind: 'exists', name: newName });
				}
			}

			// 0. On rename, plan the project-wide link rewrite *before* touching
			//    anything: read each linking file, compute its new content, and
			//    verify it is unchanged since indexing. A stale target throws
			//    here, so the whole save aborts with nothing written (ADR-0010).
			const linkRewritePlan = isRename
				? await this.planProjectLinkRewrite(folder, oldName, newName, oldFilePath)
				: [];

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
				filePath = newFilePath;
				let renamedMtime: number;
				try {
					({ mtime: renamedMtime } = await renameFolioFile(oldFilePath, filePath));
				} catch (err) {
					console.error(`Rename failed ${oldFilePath} -> ${filePath}:`, err);
					throw new RenameFailedError(String(err));
				}
				this.renameFolioRecord(folder, oldName, newName, filePath, renamedMtime);

				// 3. Commit the pre-verified link rewrite. If this fails partway
				//    the index and primary file are already consistent — only
				//    other files' wikilinks may be stale.
				try {
					linksRewritten = await this.commitProjectLinkRewrite(linkRewritePlan);
				} catch (err) {
					console.error(`Partial link rewrite after rename ${oldName} -> ${newName}:`, err);
					throw new LinkRewriteFailedError(String(err), newName);
				}
				renamedTo = newName;
			}

			// Update index from the validated in-memory folio — no re-read needed.
			const finalStat = await stat(filePath);
			const snippet = this.deriveSnippet(folioToWrite);
			const coverWarning = await this.getCoverWarning(folioToWrite.coverImage);
			if (coverWarning) warnings.push(coverWarning);
			this.updateFolioRecord(folder, renamedTo ?? oldName, {
				mtime: finalStat.mtimeMs,
				title: folioToWrite.title,
				tags: folioToWrite.tags,
				aliases: folioToWrite.aliases,
				coverImage: folioToWrite.coverImage,
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
			const typeKey = this.getSchemaIndex().typeKeyForFolder(folder);
			if (!typeKey) throw new BadRequestError(`Unknown folder: ${folder}`);

			this.validateForWrite(folio, schema);
			this.assertTypeMatchesFolder(folio.type, typeKey, folder);

			const filename = displayNameToFilename(folio.title || folio.name);
			if (!filename) throw new InvalidTitleError();
			const clash = this.findNameClash(folder, filename);
			if (clash) throw new ConflictError({ kind: 'exists', name: clash.name });

			const folioToWrite: ParsedFolio = { ...folio, name: filename };
			const folderPath = resolve(this.projectPath, folder);
			const filePath = join(folderPath, `${filename}.md`);
			// Not in the index, but on disk: created outside the app since the
			// last index build. Writing would replace it.
			if (await statFile(filePath)) throw new ConflictError({ kind: 'exists', name: filename });
			const markdown = serializeToMarkdown(folioToWrite, schema);
			const warnings = this.reparseWarnings(markdown, schema);
			const { mtime } = await writeFolioFile(filePath, markdown);
			const snippet = this.deriveSnippet(folioToWrite);
			const coverWarning = await this.getCoverWarning(folioToWrite.coverImage);
			if (coverWarning) warnings.push(coverWarning);
			this.addFolioRecord({
				type: typeKey,
				folder,
				name: filename,
				title: folioToWrite.title || filename,
				filePath,
				mtime,
				tags: folioToWrite.tags,
				aliases: folioToWrite.aliases,
				coverImage: folioToWrite.coverImage,
				snippet,
				warnings,
				links: extractAllLinks(folioToWrite),
			});
			const brokenLinks = collectBrokenLinks(folioToWrite, (f, n) => !!this.getRecord(f, n));
			return { name: filename, mtime, warnings, brokenLinks };
		});
	}

	/** Delete a folio and remove it from the index. */
	async deleteFolio(folder: string, name: string, deleteCoverImage = false): Promise<void> {
		return this.writeMutex.runExclusive(async () => {
			const record = this.getRecord(folder, name);
			if (!record) throw new NotFoundError('Folio not found');
			let coverFilePath: string | undefined;
			if (deleteCoverImage) {
				const { content } = await readFolioFile(record.filePath);
				const coverImage = parseMarkdown(content, this.getSchema()).coverImage;
				if (coverImage) coverFilePath = (await resolveImageFile(this.projectPath, coverImage.path)).filePath;
			}
			await deleteFolioFile(record.filePath);
			if (coverFilePath) await deleteImageFile(coverFilePath);
			this.removeFolioRecord(folder, name);
		});
	}

	/**
	 * Re-read `config.json` alone, after the registry has rewritten it. Holds
	 * the write mutex like every other state change, and leaves the previous
	 * config in place if the file no longer validates.
	 */
	async refreshConfig(): Promise<void> {
		return this.writeMutex.runExclusive(async () => {
			this.config = await this.loadJson('config.json', ConfigSchema.parse);
		});
	}

	/** Resolves once every write already queued on this store has finished. */
	async idle(): Promise<void> {
		return this.writeMutex.runExclusive(async () => undefined);
	}

	/**
	 * Re-read the whole project from disk. Holds the write mutex, so it never
	 * interleaves with a save; and swaps the new state in only once all of it
	 * has been read, so a failed reload keeps the previous project serving.
	 */
	async reload(): Promise<void> {
		return this.writeMutex.runExclusive(async () => {
			this.install(await this.readProject());
			console.log('  • project reloaded from disk');
		});
	}

	// ── Private ─────────────────────────────────────────────

	private async readProject(): Promise<ProjectSnapshot> {
		const dirStat = await stat(this.projectPath).catch(() => null);
		if (!dirStat || !dirStat.isDirectory()) {
			throw new Error(`Project path is not a directory: ${this.projectPath}`);
		}
		const config = await this.loadJson('config.json', ConfigSchema.parse);
		const schema = await this.loadJson('schema.json', ProjectSchemaSchema.parse);
		const schemaIndex = createSchemaIndex(schema);
		const { theme, warnings: themeWarnings } = await this.readTheme();
		const folios = await this.buildFolioIndex(schema, schemaIndex);
		return { config, schema, schemaIndex, theme, themeWarnings, folios };
	}

	private install(snapshot: ProjectSnapshot): void {
		this.config = snapshot.config;
		this.schema = snapshot.schema;
		this.schemaIndex = snapshot.schemaIndex;
		this.theme = snapshot.theme;
		this.themeWarnings = snapshot.themeWarnings;
		this.folios = snapshot.folios;
		this.nextId = snapshot.folios.length + 1;
	}

	/**
	 * The record in `folder` whose name matches `name` ignoring case, other
	 * than `except`. Windows and macOS filesystems are case-insensitive by
	 * default, so writing `troy.md` beside `Troy.md` replaces it — and Obsidian
	 * resolves links case-insensitively too. Names are unique per folder
	 * ignoring case.
	 */
	private findNameClash(folder: string, name: string, except?: string): InternalFolioRecord | undefined {
		const key = name.toLowerCase();
		return this.folios.find((f) => f.folder === folder && f.name !== except && f.name.toLowerCase() === key);
	}

	/** A folio's `type` must be the one its folder belongs to; otherwise the file and the index disagree. */
	private assertTypeMatchesFolder(type: string, folderType: string, folder: string): void {
		if (type !== folderType) {
			throw new BadRequestError(`Type "${type}" does not belong in folder "${folder}", which holds "${folderType}".`);
		}
	}

	/**
	 * Read-side warnings that depend on where a file sits rather than on its
	 * content: a `type` that is not its folder's, and a cover image that does
	 * not resolve.
	 */
	private async locationWarnings(
		parsedType: string,
		folderType: string,
		folder: string,
		coverImage: CoverImage | undefined,
	): Promise<string[]> {
		const warnings: string[] = [];
		if (parsedType && parsedType !== folderType) {
			warnings.push(`Type "${parsedType}" does not match folder "${folder}", which holds "${folderType}".`);
		}
		const coverWarning = await this.getCoverWarning(coverImage);
		if (coverWarning) warnings.push(coverWarning);
		return warnings;
	}

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
		const issues = validateAgainstSchema(parsed.data, schema, 'write');
		if (issues.length > 0) {
			throw new ValidationError('schema-violation', issues);
		}
	}

	/**
	 * Phase 1 of the multi-file link rewrite (ADR-0010): read every candidate
	 * file, compute its rewritten content, and verify it has not changed on
	 * disk since it was indexed. Nothing is written here.
	 *
	 * Only files that actually contain a matching link are planned — and so
	 * only those are staleness-checked. An unrelated file edited externally
	 * must not block a rename it has no stake in.
	 *
	 * Throws `ConflictError` with kind `link-target-stale` on the first
	 * mismatch, so the caller can abort before the first write.
	 */
	private async planProjectLinkRewrite(
		folder: string,
		oldName: string,
		newName: string,
		skipFilePath: string,
	): Promise<PlannedLinkRewrite[]> {
		const plan: PlannedLinkRewrite[] = [];
		for (const filePath of this.getAllFilePaths()) {
			if (filePath === skipFilePath) continue;
			const content = await readFile(filePath, 'utf-8');
			const result = rewriteWikiLinks(content, { folder, name: oldName }, { name: newName });
			if (result.rewrites === 0) continue;

			// Stat *after* the read: an edit landing either before the read or
			// between read and stat leaves an advanced mtime, so both are caught.
			const indexed = this.folios.find((f) => f.filePath === filePath);
			const fileStat = await statFile(filePath);
			// Same 5 ms slop as the primary-file check in saveFolio. A missing
			// stat (deleted underneath us) counts as changed, as does a record
			// that somehow left the index between the scan and here.
			const changed = !indexed || !fileStat || Math.abs(fileStat.mtime - indexed.mtime) > 5;
			if (changed) {
				throw new ConflictError({
					kind: 'link-target-stale',
					file: relative(this.projectPath, filePath),
				});
			}

			plan.push({ filePath, content: result.content, rewrites: result.rewrites });
		}
		return plan;
	}

	/**
	 * Phase 2 of the multi-file link rewrite (ADR-0010): write the verified
	 * plan. Returns the total number of link occurrences rewritten.
	 *
	 * A small check-to-write window remains, and is accepted: each write is
	 * atomic (tmp+rename), so the failure mode is a torn *batch*, never a torn
	 * file. Closing it fully would need file locking, out of scope here.
	 */
	private async commitProjectLinkRewrite(plan: PlannedLinkRewrite[]): Promise<number> {
		let totalRewrites = 0;
		for (const { filePath, content, rewrites } of plan) {
			const { mtime } = await writeFolioFile(filePath, content);
			this.updateMtime(filePath, mtime);
			totalRewrites += rewrites;
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

	private async buildFolioIndex(schema: ProjectSchema, schemaIndex: SchemaIndex): Promise<InternalFolioRecord[]> {
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
		const folios: InternalFolioRecord[] = [];
		let id = 1;
		for (const { typeKey, folder, file } of allFiles) {
			let tags: string[] = [];
			let aliases: string[] | undefined;
			let coverImage: CoverImage | undefined;
			let snippet: string | undefined;
			let warnings: string[];
			let links: WikiLink[] = [];
			let title = filenameToDisplayName(file.name);
			try {
				const { content } = await readFolioFile(file.filePath);
				const parsed = parseMarkdown(content, schema);
				tags = parsed.tags;
				aliases = parsed.aliases;
				coverImage = parsed.coverImage;
				warnings = [
					...(parsed.warnings ?? []),
					...(await this.locationWarnings(parsed.type, typeKey, folder, coverImage)),
				];
				if (parsed.title) title = parsed.title;
				snippet = this.deriveSnippet(parsed, schemaIndex);
				links = extractAllLinks(parsed);
			} catch (err) {
				warnings = [`Failed to parse: ${err instanceof Error ? err.message : String(err)}`];
			}
			folios.push({
				id: id++,
				type: typeKey,
				folder,
				name: file.name,
				title,
				filePath: file.filePath,
				mtime: file.mtime,
				tags,
				aliases,
				coverImage,
				snippet,
				warnings,
				links,
			});
		}
		console.log(`  • indexed ${folios.length} folios`);
		return folios;
	}

	private async getCoverWarning(coverImage: CoverImage | undefined): Promise<string | undefined> {
		if (!coverImage) return undefined;
		const resolution = await resolveImageFile(this.projectPath, coverImage.path);
		if (!resolution.error) return undefined;
		if (resolution.error === 'ambiguous') return `Cover image "${coverImage.path}" is ambiguous; use a vault-relative path`;
		if (resolution.error === 'outside-project') return `Cover image "${coverImage.path}" resolves outside the project`;
		return `Cover image "${coverImage.path}" was not found`;
	}

	/**
	 * Read the optional theme.json (ADR-0001). Unlike `loadJson` this never
	 * throws: a missing file means the app defaults, and an unreadable or
	 * invalid one falls back to them with warnings.
	 */
	private async readTheme(): Promise<{ theme: Theme; warnings: string[] }> {
		const fullPath = resolve(this.projectPath, 'theme.json');

		let raw: string;
		try {
			raw = await readFile(fullPath, 'utf-8');
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
				return { theme: {}, warnings: [`Could not read theme.json, using the default theme: ${(err as Error).message}`] };
			}
			return { theme: {}, warnings: [] };
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch (err) {
			return { theme: {}, warnings: [`Invalid JSON, using the default theme: ${(err as Error).message}`] };
		}

		const result = parseTheme(parsed);
		console.log(`  • theme: ${Object.keys(result.theme).join(', ') || 'no usable sections'}`);
		return result;
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
