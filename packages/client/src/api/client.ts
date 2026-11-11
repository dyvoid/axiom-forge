/**
 * Typed fetch wrapper for the Axiom Forge API.
 * Throws on non-2xx responses with a readable error message.
 */

const BASE = '/api';

export class ApiError extends Error {
	constructor(public status: number, message: string) {
		super(message);
		this.name = 'ApiError';
	}
}

export class ConflictError extends Error {
	/**
	 * `staleLinkFile` is set when a *rename* was aborted because another file
	 * holding wikilinks to this folio changed on disk (ADR-0010). Nothing was
	 * written in that case — unlike a plain stale-mtime conflict.
	 */
	constructor(
		public serverMtime: number,
		public staleLinkFile?: string,
	) {
		super(
			staleLinkFile
				? `Linking file changed externally on disk: ${staleLinkFile}`
				: 'File changed externally on disk',
		);
		this.name = 'ConflictError';
	}
}

/**
 * Build the error for a non-2xx response. A save the schema rejects carries a
 * list of human-readable issues, and other failures usually carry a sentence
 * in `error`; both read better than the raw JSON body. Anything else keeps the
 * status line and body for debugging.
 */
export async function apiError(res: Response): Promise<ApiError> {
	const body = await res.text().catch(() => '');
	try {
		const data = JSON.parse(body) as { error?: unknown; issues?: unknown; reason?: unknown };
		// A project that will not load: the reason names the file and what is wrong with it.
		if (data.error === 'invalid-project' && typeof data.reason === 'string') {
			return new ApiError(res.status, data.reason);
		}
		if (data.error === 'schema-violation' && Array.isArray(data.issues)) {
			const messages = data.issues
				.map((issue) => (issue as { message?: unknown }).message)
				.filter((m): m is string => typeof m === 'string');
			if (messages.length > 0) return new ApiError(res.status, messages.join(' '));
		}
		// A sentence the server wrote for a person ("Unknown folder: X") reads
		// better bare. Machine codes ("invalid-shape") keep the raw body below.
		if (typeof data.error === 'string' && /\s/.test(data.error)) {
			return new ApiError(res.status, data.error);
		}
	} catch {
		// Not JSON — fall through to the raw body.
	}
	return new ApiError(res.status, `${res.status} ${res.statusText}: ${body}`);
}

// ── The open project ────────────────────────────────────
//
// The folio endpoints carry no project id: they serve whichever project the
// server has open (ADR-0023). Every request therefore names the project this
// window believes is open, and the server refuses it with `project-changed`
// if another window has switched since — instead of answering from, or
// writing into, a project the user is not looking at.

const PROJECT_HEADER = 'X-Axiom-Project';

/**
 * The project this window is showing: `undefined` until the first project
 * list arrives, `null` while it shows none.
 *
 * Deliberately not "whatever the server has open". When another window
 * switches project the list this window fetches next names the new one, but
 * everything on screen here, an unsaved draft included, still belongs to the
 * old one. The header keeps saying so until the user decides what this window
 * should do (`ProjectDrift`), which is what keeps its saves refused meanwhile.
 */
let windowProject: string | null | undefined;

export function getWindowProject(): string | null | undefined {
	return windowProject;
}

/** Called when this window deliberately moves to a project (or to none). */
export function setWindowProject(id: string | null): void {
	windowProject = id;
}

const projectChangedListeners = new Set<() => void>();

/** Called when the server reports that the open project is not the one this window thought. */
export function onProjectChanged(listener: () => void): () => void {
	projectChangedListeners.add(listener);
	return () => projectChangedListeners.delete(listener);
}

/**
 * `fetch` against the API, naming the open project. Every call goes through
 * here so that none can forget the header.
 */
async function send(path: string, init: RequestInit = {}): Promise<Response> {
	const headers = new Headers(init.headers);
	if (windowProject) headers.set(PROJECT_HEADER, windowProject);
	const res = await fetch(`${BASE}${path}`, { ...init, headers });
	if (res.status === 409) {
		const data = (await res.clone().json().catch(() => null)) as { error?: unknown } | null;
		if (data?.error === 'project-changed') {
			for (const listener of projectChangedListeners) listener();
			throw new ApiError(409, 'Another project was opened in a different window, so nothing was saved here.');
		}
	}
	return res;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await send(path, init);
	if (!res.ok) throw await apiError(res);
	return res.json() as Promise<T>;
}

function jsonBody(method: string, body: unknown): RequestInit {
	return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

// ── Typed API methods ───────────────────────────────────

import type { Config, CoverImage, ProjectSchema, FolioIndexRecord, ParsedFolio, Theme } from '@axiom-forge/shared';

export function fetchConfig(): Promise<Config> {
	return request<Config>('/config');
}

export function fetchSchema(): Promise<ProjectSchema> {
	return request<ProjectSchema>('/schema');
}

export function fetchTheme(): Promise<Theme> {
	return request<Theme>('/theme');
}

export function fetchFolios(): Promise<FolioIndexRecord[]> {
	return request<FolioIndexRecord[]>('/folios');
}

export function fetchSearch(q: string): Promise<FolioIndexRecord[]> {
	return request<FolioIndexRecord[]>(`/search?q=${encodeURIComponent(q)}`);
}

export function fetchBacklinks(folder: string, name: string): Promise<FolioIndexRecord[]> {
	return request<FolioIndexRecord[]>(`/folios/${encodeURIComponent(folder)}/${encodeURIComponent(name)}/backlinks`);
}

export function fetchFolio(folder: string, name: string): Promise<ParsedFolio & { id: number; mtime: number }> {
	return request(`/folios/${encodeURIComponent(folder)}/${encodeURIComponent(name)}`);
}

export interface BrokenLinkReport {
	section: string;
	field?: string;
	folder: string;
	name: string;
}

export interface SaveFolioResponse {
	mtime: number;
	warnings: string[];
	brokenLinks: BrokenLinkReport[];
	/** Present only when the H1 changed and the file was renamed on disk. */
	renamedTo?: string;
	/** Present only on rename; count of `[[…]]` occurrences rewritten across the project. */
	linksRewritten?: number;
}

export async function putFolio(
	folder: string,
	name: string,
	folio: ParsedFolio,
	clientMtime: number,
): Promise<SaveFolioResponse> {
	const res = await send(
		`/folios/${encodeURIComponent(folder)}/${encodeURIComponent(name)}`,
		jsonBody('PUT', { folio, clientMtime }),
	);
	if (res.status === 409) {
		const data = (await res.json().catch(() => ({}))) as {
			error?: string;
			serverMtime?: number;
			file?: string;
		};
		throw data.error === 'link-target-stale'
			? new ConflictError(0, data.file ?? 'an unknown file')
			: new ConflictError(data.serverMtime ?? 0);
	}
	if (!res.ok) throw await apiError(res);
	return res.json() as Promise<SaveFolioResponse>;
}

export async function postFolio(
	folder: string,
	folio: ParsedFolio,
): Promise<{ name: string; mtime: number; warnings: string[]; brokenLinks: BrokenLinkReport[] }> {
	const res = await send(`/folios/${encodeURIComponent(folder)}`, jsonBody('POST', { folio }));
	if (res.status === 409) {
		throw new ApiError(409, 'A folio with that name already exists');
	}
	if (!res.ok) throw await apiError(res);
	return res.json() as Promise<{ name: string; mtime: number; warnings: string[]; brokenLinks: BrokenLinkReport[] }>;
}

function coverImagePath(folder: string, name: string): string {
	return `/folios/${encodeURIComponent(folder)}/${encodeURIComponent(name)}/image`;
}

/** For an `<img src>`, which cannot send the project header; the server allows reads without it. */
export function coverImageUrl(folder: string, name: string): string {
	return `${BASE}${coverImagePath(folder, name)}`;
}

export async function uploadCoverImage(folder: string, name: string, file: File): Promise<CoverImage> {
	const res = await send(
		`${coverImagePath(folder, name)}?filename=${encodeURIComponent(file.name)}`,
		{ method: 'PUT', headers: { 'Content-Type': file.type }, body: file },
	);
	if (!res.ok) throw await apiError(res);
	const data = await res.json() as { coverImage: CoverImage };
	return data.coverImage;
}

export async function deleteFolio(folder: string, name: string, deleteCoverImage = false): Promise<void> {
	const res = await send(
		`/folios/${encodeURIComponent(folder)}/${encodeURIComponent(name)}?deleteCoverImage=${deleteCoverImage}`,
		{ method: 'DELETE' },
	);
	if (!res.ok) throw await apiError(res);
}

export function fetchWarnings(): Promise<{ folder: string; name: string; warnings: string[] }[]> {
	return request('/warnings');
}

export async function reloadProject(): Promise<void> {
	const res = await send('/reload', { method: 'POST' });
	if (!res.ok) throw await apiError(res);
}

// ── Projects (ADR-0023) ─────────────────────────────────

export interface ProjectSummary {
	id: string;
	/** Absolute path of the project folder on this machine. */
	path: string;
	name: string;
	description?: string;
	version?: string;
	/** False when the folder is gone or its config.json is unreadable. */
	available: boolean;
	problem?: string;
}

export interface ProjectLibrary {
	/** The open project, or null when none is. */
	activeId: string | null;
	projects: ProjectSummary[];
}

export interface ProjectSettings {
	name: string;
	description?: string;
	version?: string;
}

/**
 * The folder offered is not a project. `canCreate` is true when it holds
 * neither project file, so a new project can be started there.
 */
export class NotAProjectError extends Error {
	constructor(public path: string, public canCreate: boolean) {
		super('That folder does not hold an Axiom Forge project.');
		this.name = 'NotAProjectError';
	}
}

/** Every project endpoint answers with the whole list. */
async function library(res: Response): Promise<ProjectLibrary> {
	if (!res.ok) throw await apiError(res);
	const data = await res.json() as ProjectLibrary;
	// The first list a window sees is the project it starts out showing.
	if (windowProject === undefined) windowProject = data.activeId;
	return data;
}

export async function fetchProjects(): Promise<ProjectLibrary> {
	return library(await send('/projects'));
}

/** Add a folder and open it. With `create`, start a new project there first. */
export async function addProject(path: string, create?: ProjectSettings): Promise<ProjectLibrary> {
	const res = await send('/projects', jsonBody('POST', create ? { path, create } : { path }));
	if (res.status === 404) {
		const data = (await res.clone().json().catch(() => null)) as { error?: string; path?: string; canCreate?: boolean } | null;
		if (data?.error === 'not-a-project') throw new NotAProjectError(data.path ?? path, data.canCreate === true);
	}
	return library(res);
}

export async function activateProject(id: string): Promise<ProjectLibrary> {
	return library(await send(`/projects/${encodeURIComponent(id)}/activate`, { method: 'POST' }));
}

export async function updateProject(id: string, settings: ProjectSettings): Promise<ProjectLibrary> {
	return library(await send(`/projects/${encodeURIComponent(id)}`, jsonBody('PATCH', settings)));
}

/**
 * Take a project off the list. `deleteFiles` also deletes its folder from
 * disk, and needs the project's name repeated as `confirmName`.
 */
export async function removeProject(
	id: string,
	options: { deleteFiles?: boolean; confirmName?: string } = {},
): Promise<ProjectLibrary> {
	const params = new URLSearchParams();
	if (options.deleteFiles) params.set('deleteFiles', 'true');
	if (options.confirmName !== undefined) params.set('confirmName', options.confirmName);
	const query = params.size > 0 ? `?${params}` : '';
	return library(await send(`/projects/${encodeURIComponent(id)}${query}`, { method: 'DELETE' }));
}
