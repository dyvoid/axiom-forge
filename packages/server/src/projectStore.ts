import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
	ConfigSchema,
	ProjectSchemaSchema,
	filenameToDisplayName,
	parseMarkdown,
	type Config,
	type ProjectSchema,
	type FolioIndexRecord,
	type ParsedFolio,
} from '@axiom-forge/shared';
import { scanFolder, readFolioFile } from './fileIO.js';

interface InternalFolioRecord extends FolioIndexRecord {
	filePath: string;
	mtime: number;
	warnings: string[];
}

export class ProjectStore {
	private config: Config | null = null;
	private schema: ProjectSchema | null = null;
	private folios: InternalFolioRecord[] = [];
	private nextId = 1;

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
	 * Update an existing folio's index record in place, after a save.
	 * Re-derives the snippet from the new prose content.
	 */
	updateFolioRecord(
		folder: string,
		name: string,
		patch: { mtime: number; title?: string; tags: string[]; snippet?: string },
	): void {
		const record = this.folios.find((f) => f.folder === folder && f.name === name);
		if (!record) return;
		record.mtime = patch.mtime;
		if (patch.title !== undefined) record.title = patch.title;
		record.tags = patch.tags;
		record.snippet = patch.snippet;
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

	async reload(): Promise<void> {
		this.config = await this.loadJson('config.json', ConfigSchema.parse);
		this.schema = await this.loadJson('schema.json', ProjectSchemaSchema.parse);
		this.folios = [];
		this.nextId = 1;
		await this.buildFolioIndex();
		console.log('  • project reloaded from disk');
	}

	// ── Private ─────────────────────────────────────────────

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
			let snippet: string | undefined;
			let warnings: string[] = [];
			let title = filenameToDisplayName(file.name);
			try {
				const { content } = await readFolioFile(file.filePath);
				const parsed = parseMarkdown(content, schema);
				tags = parsed.tags;
				warnings = parsed.warnings ?? [];
				if (parsed.title) title = parsed.title;

				const typeDef = schema.types[typeKey];
				if (typeDef) {
					const proseSectionName = Object.entries(typeDef.sections).find(([, def]) => def.role === 'prose')?.[0];
					if (proseSectionName) {
						const proseContent = parsed.sections[proseSectionName]?.content;
						if (proseContent) {
							// Split by double newline to get the true first paragraph, then flatten any hard-wrapped lines
							const firstParagraph = proseContent.split(/\n\s*\n/).map(s => s.trim().replace(/\n/g, ' ')).filter(Boolean)[0];
							if (firstParagraph) {
								let text = firstParagraph.replace(/^[#*>-]+\s*/, '');
								if (text.length > 120) {
									// Truncate cleanly without splitting words or leaving trailing punctuation
									text = text.substring(0, 120);
									text = text.substring(0, Math.min(text.length, text.lastIndexOf(' ')));
									text = text.replace(/[\s,;:\-.]+$/, '');
									snippet = text + '...';
								} else {
									snippet = text;
								}
							}
						}
					}
				}
			} catch {
				// If parsing fails, still index the folio with no tags
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
				snippet,
				warnings,
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
			throw new Error(`Invalid JSON in ${fullPath}: ${(err as Error).message}`);
		}
		try {
			return validate(parsed);
		} catch (err) {
			throw new Error(`Schema validation failed for ${fullPath}:\n${(err as Error).message}`);
		}
	}
}
