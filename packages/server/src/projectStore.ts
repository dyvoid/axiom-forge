import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
	ConfigSchema,
	ProjectSchemaSchema,
	type Config,
	type ProjectSchema,
} from '@axiom-forge/shared';

export class ProjectStore {
	private config: Config | null = null;
	private schema: ProjectSchema | null = null;

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
	}

	getConfig(): Config {
		if (!this.config) throw new Error('ProjectStore not loaded.');
		return this.config;
	}

	getSchema(): ProjectSchema {
		if (!this.schema) throw new Error('ProjectStore not loaded.');
		return this.schema;
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
