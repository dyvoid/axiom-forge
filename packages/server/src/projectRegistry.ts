/**
 * The projects this installation knows about, and which one is open.
 *
 * A project is a folder (see CONTEXT.md); the registry is only a list of
 * folder paths, kept in one small JSON file outside every project so that no
 * project carries machine-specific paths. Exactly one project is *active* at a
 * time, held as a loaded `ProjectStore`, and every folio endpoint serves it.
 * See ADR-0023.
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path';
import { ConfigSchema, ProjectSchemaSchema, type Config, type ProjectSchema } from '@axiom-forge/shared';
import { ProjectStore } from './projectStore.js';
import { Mutex } from './utils/mutex.js';
import { BadRequestError, NotAProjectError, NotFoundError, ProjectLoadError } from './storeErrors.js';

/** One row of the project list, as the client sees it. */
export interface ProjectSummary {
	id: string;
	/** Absolute path of the project folder. */
	path: string;
	/** From `config.json`; the folder name when that cannot be read. */
	name: string;
	description?: string;
	version?: string;
	/** False when the folder is gone or its `config.json` is unreadable. */
	available: boolean;
	/** Why it is unavailable, in a sentence. */
	problem?: string;
}

export interface ProjectLibrary {
	/** The open project, or null when none is: first run, or after removing the open one. */
	activeId: string | null;
	projects: ProjectSummary[];
}

/** The editable part of `config.json`. An empty optional field removes the key. */
export interface ConfigPatch {
	name: string;
	description?: string;
	version?: string;
}

interface RegistryEntry {
	id: string;
	path: string;
}

interface RegistryFile {
	version: 1;
	activeId: string | null;
	projects: RegistryEntry[];
}

/**
 * The schema a new project starts with: one type, with a meta section, a prose
 * section and a links section, so the read view's whole layout shows up on the
 * first folio. Deliberately generic. Choosing a schema that fits a particular
 * kind of world is ADR-0013's subject, not this one's.
 */
const STARTER_SCHEMA: ProjectSchema = {
	version: '1.0.0',
	types: {
		Entry: {
			icon: 'file-text',
			folder: 'Entries',
			sections: {
				Details: {
					role: 'meta',
					fields: {
						Summary: { type: 'text' },
						Related: { type: 'wikilink-list', target: 'Entries' },
					},
				},
				Notes: { role: 'prose', type: 'textarea' },
			},
		},
	},
};

/** Where the registry lives unless `AXIOM_FORGE_HOME` says otherwise. */
export function defaultRegistryPath(): string {
	const home = process.env.AXIOM_FORGE_HOME || join(homedir(), '.axiom-forge');
	return join(home, 'projects.json');
}

function toJson(value: unknown): string {
	return `${JSON.stringify(value, null, '\t')}\n`;
}

/** Write via a temp file and rename, so a crash never leaves half a file. */
async function writeFileAtomic(filePath: string, content: string): Promise<void> {
	const tempPath = `${filePath}.tmp`;
	await writeFile(tempPath, content, 'utf-8');
	await rename(tempPath, filePath);
}

async function isFile(filePath: string): Promise<boolean> {
	return (await stat(filePath).catch(() => null))?.isFile() ?? false;
}

/**
 * The canonical form of a folder path: symlinks resolved, and on a
 * case-insensitive filesystem the casing the disk actually uses. Two
 * spellings of one folder must come out as one project.
 */
async function canonicalPath(folderPath: string): Promise<string> {
	return realpath(folderPath).catch(() => resolve(folderPath));
}

function idForPath(canonical: string): string {
	return createHash('sha256').update(canonical).digest('hex').slice(0, 12);
}

/** True when `inner` is `outer` or sits somewhere beneath it. */
function isWithin(outer: string, inner: string): boolean {
	const rel = relative(outer, inner);
	return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

/**
 * Expand a leading `~` and insist on an absolute path. The path comes from a
 * text field in a browser, where "relative" has no meaning: there is no
 * working directory the user could see.
 */
function resolveUserPath(input: unknown): string {
	if (typeof input !== 'string' || input.trim() === '') {
		throw new BadRequestError('Enter the path of a folder.');
	}
	let path = input.trim();
	if (path === '~' || path.startsWith('~/') || path.startsWith('~\\')) {
		path = join(homedir(), path.slice(1));
	}
	if (!isAbsolute(path)) {
		throw new BadRequestError('Enter a full path, starting from the drive or the root folder.');
	}
	return resolve(path);
}

function readConfigPatch(input: unknown): ConfigPatch {
	const raw = (input ?? {}) as Record<string, unknown>;
	const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
	const name = text(raw.name);
	if (!name) throw new BadRequestError('A project needs a name.');
	return { name, description: text(raw.description), version: text(raw.version) };
}

export class ProjectRegistry {
	private entries: RegistryEntry[] = [];
	private active: { id: string; store: ProjectStore } | null = null;
	/** Serializes every change to the list or to which project is open. */
	private readonly mutex = new Mutex();

	constructor(private readonly registryPath: string = defaultRegistryPath()) {}

	/** The open project's id, or null. */
	get activeId(): string | null {
		return this.active?.id ?? null;
	}

	/** The open project's store, or null. */
	activeStore(): ProjectStore | null {
		return this.active?.store ?? null;
	}

	/**
	 * Read the registry and open a project, in this order of preference: the
	 * `--project` path if one was given, else the project that was open last
	 * time, else — on a first run, before any list has been saved — the bundled
	 * sample. An empty list the user arrived at by removing projects stays empty.
	 *
	 * Never throws for a project that will not load. The server still starts,
	 * with no project open, and the client shows the list with the reason.
	 */
	async init(options: { projectPath?: string; samplePath?: string } = {}): Promise<void> {
		const { file, firstRun } = await this.readRegistryFile();
		this.entries = file.projects;

		let wanted: string | null = file.activeId;
		if (options.projectPath) {
			wanted = (await this.register(resolve(options.projectPath))).id;
		} else if (firstRun && options.samplePath && await isFile(join(options.samplePath, 'config.json'))) {
			wanted = (await this.register(options.samplePath)).id;
		}

		const entry = this.entries.find((e) => e.id === wanted);
		if (entry) {
			try {
				await this.open(entry);
			} catch (err) {
				const reason = err instanceof ProjectLoadError ? err.reason : String(err);
				console.error(`Could not open project ${entry.path}:\n${reason}`);
			}
		}
		await this.persist();
	}

	async list(): Promise<ProjectLibrary> {
		const projects = await Promise.all(this.entries.map((entry) => this.summarize(entry)));
		projects.sort((a, b) => a.name.localeCompare(b.name));
		return { activeId: this.activeId, projects };
	}

	/**
	 * Add a folder to the list and open it. With `create`, first start a new
	 * project there: a `config.json` and the starter `schema.json`.
	 *
	 * @throws NotAProjectError when the folder is not a project and `create` was not asked for.
	 * @throws ProjectLoadError when it is a project but will not load; nothing is added.
	 */
	async add(pathInput: unknown, create?: unknown): Promise<ProjectLibrary> {
		return this.mutex.runExclusive(async () => {
			const folderPath = resolveUserPath(pathInput);
			const hasConfig = await isFile(join(folderPath, 'config.json'));
			const hasSchema = await isFile(join(folderPath, 'schema.json'));

			if (create !== undefined) {
				if (hasConfig || hasSchema) {
					throw new BadRequestError('That folder already holds project files. Add it as an existing project instead.');
				}
				await this.scaffold(folderPath, readConfigPatch(create));
			} else if (!hasConfig || !hasSchema) {
				const dirStat = await stat(folderPath).catch(() => null);
				if (dirStat && !dirStat.isDirectory()) throw new BadRequestError('That path is a file, not a folder.');
				throw new NotAProjectError(folderPath, !hasConfig && !hasSchema);
			}

			const known = new Set(this.entries.map((e) => e.id));
			const entry = await this.register(folderPath);
			try {
				await this.open(entry);
			} catch (err) {
				// Leave the list as it was: a folder that cannot be opened is
				// not worth remembering. One already listed stays listed.
				if (!known.has(entry.id)) this.entries = this.entries.filter((e) => e.id !== entry.id);
				throw err;
			}
			await this.persist();
			return this.list();
		});
	}

	/** Open a listed project. On failure the one that was open stays open. */
	async activate(id: string): Promise<ProjectLibrary> {
		return this.mutex.runExclusive(async () => {
			const entry = this.require(id);
			if (this.active?.id !== id) {
				await this.open(entry);
				await this.persist();
			}
			return this.list();
		});
	}

	/** Rewrite a listed project's `config.json`, keeping any keys the app does not manage. */
	async updateConfig(id: string, patchInput: unknown): Promise<ProjectLibrary> {
		return this.mutex.runExclusive(async () => {
			const entry = this.require(id);
			const patch = readConfigPatch(patchInput);
			const configPath = join(entry.path, 'config.json');

			let current: Record<string, unknown>;
			try {
				const parsed: unknown = JSON.parse(await readFile(configPath, 'utf-8'));
				if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('not an object');
				current = parsed as Record<string, unknown>;
			} catch (err) {
				throw new ProjectLoadError(`Could not read ${configPath}: ${(err as Error).message}`);
			}

			const next: Record<string, unknown> = { ...current, name: patch.name };
			for (const key of ['description', 'version'] as const) {
				if (patch[key]) next[key] = patch[key];
				else delete next[key];
			}
			ConfigSchema.parse(next);
			await writeFileAtomic(configPath, toJson(next));

			if (this.active?.id === id) await this.active.store.refreshConfig();
			return this.list();
		});
	}

	/**
	 * Take a project off the list. With `deleteFiles`, also delete its folder
	 * from disk — everything in it, not only what the app wrote.
	 *
	 * Deleting is guarded three ways, because the path is whatever was once
	 * typed into a text field: the folder must still hold a `config.json` and
	 * `schema.json`; it must not be a place whose loss reaches beyond the
	 * project (a drive root, the home folder, or a folder the server itself
	 * runs from); and `confirmName` must match the project's name, so the
	 * request cannot be a stray click or a stale tab acting on the wrong row.
	 */
	async remove(id: string, options: { deleteFiles?: boolean; confirmName?: string } = {}): Promise<ProjectLibrary> {
		return this.mutex.runExclusive(async () => {
			const entry = this.require(id);

			if (options.deleteFiles) {
				const config = await this.readConfig(entry.path).catch(() => null);
				if (!config || !await isFile(join(entry.path, 'schema.json'))) {
					throw new BadRequestError(
						'That folder no longer looks like a project, so it was left alone. Remove it from the list instead.',
					);
				}
				if (options.confirmName !== config.name) {
					throw new BadRequestError('The name typed does not match the project\'s name. Nothing was deleted.');
				}
				const target = await canonicalPath(entry.path);
				const protectedPaths = [await canonicalPath(homedir()), await canonicalPath(process.cwd())];
				if (target === parse(target).root || protectedPaths.some((p) => isWithin(target, p))) {
					throw new BadRequestError(
						'That folder contains more than this project (your home folder, or Axiom Forge itself), so it will not be deleted. '
						+ 'Remove it from the list, then delete the files by hand.',
					);
				}
			}

			if (this.active?.id === id) {
				// Let a save that is already running finish before the files go.
				await this.active.store.idle();
				this.active = null;
			}
			if (options.deleteFiles) await rm(entry.path, { recursive: true, force: true });

			this.entries = this.entries.filter((e) => e.id !== id);
			await this.persist();
			return this.list();
		});
	}

	// ── Private ─────────────────────────────────────────────

	private require(id: string): RegistryEntry {
		const entry = this.entries.find((e) => e.id === id);
		if (!entry) throw new NotFoundError('Project not found');
		return entry;
	}

	/** Add a folder to the in-memory list if it is not there, and return its entry. */
	private async register(folderPath: string): Promise<RegistryEntry> {
		const path = await canonicalPath(folderPath);
		const id = idForPath(path);
		const existing = this.entries.find((e) => e.id === id);
		if (existing) return existing;
		const entry = { id, path };
		this.entries.push(entry);
		return entry;
	}

	/**
	 * Load a project and make it the active one. The store is fully loaded
	 * before it replaces the current one, so a project that fails to load
	 * leaves the previous project serving.
	 */
	private async open(entry: RegistryEntry): Promise<void> {
		const store = new ProjectStore(entry.path);
		console.log(`Axiom Forge — loading project: ${entry.path}`);
		try {
			await store.load();
		} catch (err) {
			throw new ProjectLoadError(err instanceof Error ? err.message : String(err));
		}
		this.active = { id: entry.id, store };
	}

	private async scaffold(folderPath: string, config: ConfigPatch): Promise<void> {
		const data: Config = { name: config.name };
		if (config.description) data.description = config.description;
		if (config.version) data.version = config.version;
		// Validated before anything is written, though both are ours to get right.
		ConfigSchema.parse(data);
		ProjectSchemaSchema.parse(STARTER_SCHEMA);

		await mkdir(folderPath, { recursive: true });
		for (const typeDef of Object.values(STARTER_SCHEMA.types)) {
			await mkdir(join(folderPath, typeDef.folder), { recursive: true });
		}
		await writeFileAtomic(join(folderPath, 'schema.json'), toJson(STARTER_SCHEMA));
		await writeFileAtomic(join(folderPath, 'config.json'), toJson(data));
	}

	private async readConfig(folderPath: string): Promise<Config> {
		return ConfigSchema.parse(JSON.parse(await readFile(join(folderPath, 'config.json'), 'utf-8')));
	}

	private async summarize(entry: RegistryEntry): Promise<ProjectSummary> {
		const base = { id: entry.id, path: entry.path };
		// The open project's config is already in memory, and is the one in use.
		if (this.active?.id === entry.id) {
			return { ...base, ...this.active.store.getConfig(), available: true };
		}
		const dirStat = await stat(entry.path).catch(() => null);
		if (!dirStat?.isDirectory()) {
			return { ...base, name: basename(entry.path), available: false, problem: 'This folder is no longer there.' };
		}
		try {
			return { ...base, ...(await this.readConfig(entry.path)), available: true };
		} catch {
			return {
				...base,
				name: basename(entry.path),
				available: false,
				problem: 'Its config.json is missing or cannot be read.',
			};
		}
	}

	private async readRegistryFile(): Promise<{ file: RegistryFile; firstRun: boolean }> {
		const empty: RegistryFile = { version: 1, activeId: null, projects: [] };
		let raw: string;
		try {
			raw = await readFile(this.registryPath, 'utf-8');
		} catch {
			return { file: empty, firstRun: true };
		}
		try {
			const data = JSON.parse(raw) as Partial<RegistryFile>;
			const projects = (Array.isArray(data.projects) ? data.projects : []).filter(
				(e): e is RegistryEntry => typeof e?.id === 'string' && typeof e?.path === 'string',
			);
			const activeId = typeof data.activeId === 'string' ? data.activeId : null;
			return { file: { version: 1, activeId, projects }, firstRun: false };
		} catch (err) {
			console.error(`Ignoring unreadable project list ${this.registryPath}: ${(err as Error).message}`);
			return { file: empty, firstRun: false };
		}
	}

	private async persist(): Promise<void> {
		const file: RegistryFile = { version: 1, activeId: this.activeId, projects: this.entries };
		await mkdir(dirname(this.registryPath), { recursive: true });
		await writeFileAtomic(this.registryPath, toJson(file));
	}
}
