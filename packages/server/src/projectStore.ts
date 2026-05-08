import { readFile, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import {
	ConfigSchema,
	ProjectSchemaSchema,
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
		return this.folios.map(({ filePath, mtime, ...rest }) => rest);
	}

	/** Return folios filtered by type key (e.g. "Character"). */
	getFoliosByType(typeKey: string): FolioIndexRecord[] {
		return this.getFolios().filter((f) => f.type === typeKey);
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
		};
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

		// Sort by birthtime ascending, filename as tiebreaker.
		allFiles.sort((a, b) => {
			const timeDiff = a.file.birthtime - b.file.birthtime;
			if (timeDiff !== 0) return timeDiff;
			return a.file.name.localeCompare(b.file.name);
		});

		// Assign IDs and parse Meta blocks for status/tags.
		this.folios = [];
		let id = 1;
		for (const { typeKey, folder, file } of allFiles) {
			let status: string | undefined;
			let tags: string[] = [];
			try {
				const { content } = await readFolioFile(file.filePath);
				const parsed = parseMarkdown(content, schema);
				status = parsed.status;
				tags = parsed.tags;
			} catch {
				// If parsing fails, still index the folio with no status/tags
			}
			this.folios.push({
				id: id++,
				type: typeKey,
				folder,
				name: file.name,
				filePath: file.filePath,
				mtime: file.mtime,
				status,
				tags,
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
