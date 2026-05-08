/**
 * Typed fetch wrapper for the Axiom Forge API.
 * Throws on non-2xx responses with a readable error message.
 */

const BASE = '/api';

class ApiError extends Error {
	constructor(public status: number, message: string) {
		super(message);
		this.name = 'ApiError';
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

export function fetchFolio(folder: string, name: string): Promise<ParsedFolio & { id: number; mtime: number }> {
	return request(`/folios/${encodeURIComponent(folder)}/${encodeURIComponent(name)}`);
}
