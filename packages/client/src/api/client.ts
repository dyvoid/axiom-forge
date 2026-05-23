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
	constructor(public serverMtime: number) {
		super('File changed externally on disk');
		this.name = 'ConflictError';
	}
}

async function request<T>(path: string): Promise<T> {
	const res = await fetch(`${BASE}${path}`);
	if (!res.ok) {
		const body = await res.text().catch(() => '');
		throw new ApiError(res.status, `${res.status} ${res.statusText}: ${body}`);
	}
	return res.json() as Promise<T>;
}

// ── Typed API methods ───────────────────────────────────

import type { Config, ProjectSchema, FolioIndexRecord, ParsedFolio } from '@axiom-forge/shared';

export function fetchConfig(): Promise<Config> {
	return request<Config>('/config');
}

export function fetchSchema(): Promise<ProjectSchema> {
	return request<ProjectSchema>('/schema');
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
	const res = await fetch(
		`${BASE}/folios/${encodeURIComponent(folder)}/${encodeURIComponent(name)}`,
		{
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ folio, clientMtime }),
		},
	);
	if (res.status === 409) {
		const data = (await res.json().catch(() => ({}))) as { serverMtime?: number };
		throw new ConflictError(data.serverMtime ?? 0);
	}
	if (!res.ok) {
		const body = await res.text().catch(() => '');
		throw new ApiError(res.status, `${res.status} ${res.statusText}: ${body}`);
	}
	return res.json() as Promise<SaveFolioResponse>;
}

export async function postFolio(
	folder: string,
	folio: ParsedFolio,
): Promise<{ name: string; mtime: number; warnings: string[]; brokenLinks: BrokenLinkReport[] }> {
	const res = await fetch(`${BASE}/folios/${encodeURIComponent(folder)}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ folio }),
	});
	if (res.status === 409) {
		throw new ApiError(409, 'A folio with that name already exists');
	}
	if (!res.ok) {
		const body = await res.text().catch(() => '');
		throw new ApiError(res.status, `${res.status} ${res.statusText}: ${body}`);
	}
	return res.json() as Promise<{ name: string; mtime: number; warnings: string[]; brokenLinks: BrokenLinkReport[] }>;
}

export async function deleteFolio(folder: string, name: string): Promise<void> {
	const res = await fetch(
		`${BASE}/folios/${encodeURIComponent(folder)}/${encodeURIComponent(name)}`,
		{ method: 'DELETE' },
	);
	if (!res.ok) {
		const body = await res.text().catch(() => '');
		throw new ApiError(res.status, `${res.status} ${res.statusText}: ${body}`);
	}
}

export function fetchWarnings(): Promise<{ folder: string; name: string; warnings: string[] }[]> {
	return request('/warnings');
}

export async function reloadProject(): Promise<void> {
	const res = await fetch(`${BASE}/reload`, { method: 'POST' });
	if (!res.ok) {
		const body = await res.text().catch(() => '');
		throw new ApiError(res.status, `${res.status} ${res.statusText}: ${body}`);
	}
}
