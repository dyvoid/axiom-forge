/**
 * TanStack Query hooks for Axiom Forge data fetching.
 */

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { ParsedFolio, FolioIndexRecord } from '@axiom-forge/shared';
import {
	fetchFolios, fetchFolio, putFolio, postFolio, deleteFolio, fetchWarnings, fetchSearch, fetchBacklinks, fetchTheme,
	fetchProjects, addProject, activateProject, updateProject, removeProject,
	getWindowProject, setWindowProject,
	type ProjectLibrary, type ProjectSettings,
} from './client.js';

// ── Projects (ADR-0023) ─────────────────────────────────

const PROJECTS_KEY = ['projects'] as const;

/** Every known project, and which one is open. */
export function useProjects() {
	return useQuery({
		queryKey: PROJECTS_KEY,
		queryFn: fetchProjects,
		// Another window can switch projects; a refocus picks that up, and
		// `ProjectDrift` asks what this window should do about it.
		staleTime: 5_000,
	});
}

/**
 * Drop everything cached from a project: config, schema, folios, the lot.
 * Query keys carry no project id, so once a different project is open none
 * of it may be shown again. Mounted queries refetch at once.
 */
function resetProjectData(qc: QueryClient): Promise<void> {
	return qc.resetQueries({ predicate: (query) => query.queryKey[0] !== PROJECTS_KEY[0] });
}

/**
 * Move this window to the project a list response says is open. If that is a
 * different project than the one it was showing, everything cached from the
 * old one is cleared before this resolves, so a caller can navigate into the
 * new project straight afterwards.
 */
export async function adoptLibrary(qc: QueryClient, library: ProjectLibrary): Promise<ProjectLibrary> {
	const previous = getWindowProject();
	setWindowProject(library.activeId);
	qc.setQueryData(PROJECTS_KEY, library);
	if (previous !== library.activeId) await resetProjectData(qc);
	return library;
}

/**
 * Open a listed project. A plain function, not a mutation hook: its one
 * caller fires it from an effect on mount, and a mutation observer drops its
 * result when StrictMode unmounts and remounts the component in between.
 */
export async function openProject(qc: QueryClient, id: string): Promise<ProjectLibrary> {
	return adoptLibrary(qc, await activateProject(id));
}

/** Add a folder as a project and open it; with `create`, start a new project there. */
export function useAddProject() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({ path, create }: { path: string; create?: ProjectSettings }) =>
			adoptLibrary(qc, await addProject(path, create)),
	});
}

/** Edit a project's name, description and version. */
export function useUpdateProject() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, settings }: { id: string; settings: ProjectSettings }) => {
			const library = await adoptLibrary(qc, await updateProject(id, settings));
			// The open project's own name may be the one that changed.
			if (library.activeId === id) void qc.invalidateQueries({ queryKey: ['config'] });
			return library;
		},
	});
}

/** Take a project off the list, optionally deleting its folder. */
export function useRemoveProject() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, deleteFiles, confirmName }: { id: string; deleteFiles?: boolean; confirmName?: string }) =>
			adoptLibrary(qc, await removeProject(id, { deleteFiles, confirmName })),
	});
}


/**
 * The project's optional theme.json (ADR-0001) — `{}` when it has none. Not
 * part of ProjectContext's loading gate: a theme is cosmetic, so a slow or
 * failed fetch must never hold up the app.
 */
export function useTheme() {
	return useQuery({
		queryKey: ['theme'],
		queryFn: fetchTheme,
		staleTime: Infinity,
	});
}

/** Schema parse warnings across all project files — fetched once at startup. */
export function useWarnings() {
	return useQuery({
		queryKey: ['warnings'],
		queryFn: fetchWarnings,
		staleTime: Infinity,
	});
}

/**
 * Everything derived from the folio index: the list itself, the warnings, and
 * the search and backlink results computed from it on the server. Any write
 * can change all four, so they are invalidated together.
 */
function invalidateIndex(qc: QueryClient): void {
	for (const key of ['folios', 'warnings', 'search', 'backlinks']) {
		void qc.invalidateQueries({ queryKey: [key] });
	}
}

/** All folio index records — drives the sidebar. */
export function useFolios() {
	return useQuery({
		queryKey: ['folios'],
		queryFn: fetchFolios,
		staleTime: 30_000,
	});
}

/** Memoized lookup map keyed by `folder/name` — O(1) resolution for chips and backlinks. */
export function useFolioMap(): Map<string, FolioIndexRecord> {
	const { data: folios } = useFolios();
	return useMemo(() => {
		const map = new Map<string, FolioIndexRecord>();
		if (folios) {
			for (const f of folios) {
				map.set(`${f.folder}/${f.name}`, f);
			}
		}
		return map;
	}, [folios]);
}

/** Search folios by query string. */
export function useSearch(query: string) {
	return useQuery({
		queryKey: ['search', query],
		queryFn: () => fetchSearch(query),
		enabled: query.trim().length > 0,
		staleTime: 5000,
	});
}

/** Fetch folios that link to a specific folio. */
export function useBacklinks(folder: string, name: string) {
	return useQuery({
		queryKey: ['backlinks', folder, name],
		queryFn: () => fetchBacklinks(folder, name),
		enabled: Boolean(folder && name),
	});
}

/** Single parsed folio — full structured data for read view. */
export function useFolio(folder: string, name: string) {
	return useQuery({
		queryKey: ['folio', folder, name],
		queryFn: () => fetchFolio(folder, name),
		enabled: Boolean(folder && name),
	});
}

/** Create a new folio and navigate to its edit URL on success. */
export function useCreateFolio(options?: { navigateOnSuccess?: boolean }) {
	const qc = useQueryClient();
	const navigate = useNavigate();
	const navigateOnSuccess = options?.navigateOnSuccess ?? true;
	return useMutation({
		mutationFn: ({ folder, folio }: { folder: string; folio: ParsedFolio }) =>
			postFolio(folder, folio),
		onSuccess: ({ name }, { folder }) => {
			invalidateIndex(qc);
			if (navigateOnSuccess) {
				navigate(`/folio/${encodeURIComponent(folder)}/${encodeURIComponent(name)}/edit`);
			}
		},
	});
}

/** Delete a folio. Caller is responsible for navigating away. */
export function useDeleteFolio() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ folder, name, deleteCoverImage }: { folder: string; name: string; deleteCoverImage: boolean }) =>
			deleteFolio(folder, name, deleteCoverImage),
		onSuccess: (_, { folder, name }) => {
			qc.removeQueries({ queryKey: ['folio', folder, name] });
			invalidateIndex(qc);
		},
	});
}

/** Save an existing folio. May rename the file if the H1 changed. */
export function useSaveFolio(folder: string, name: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ folio, clientMtime }: { folio: ParsedFolio; clientMtime: number }) =>
			putFolio(folder, name, folio, clientMtime),
		onSuccess: (response, { folio }) => {
			const { mtime, warnings, renamedTo } = response;
			if (renamedTo) {
				// File was renamed on disk, and every folio linking to it was
				// rewritten. Drop them all, not just the old name: an editor
				// seeded from a cached copy would write the old link back.
				qc.removeQueries({ queryKey: ['folio'] });
				qc.setQueryData(['folio', folder, renamedTo], (prev: unknown) => {
					const base = (prev as ParsedFolio & { id: number; mtime: number } | undefined) ?? null;
					const next = { ...folio, name: renamedTo, mtime, warnings };
					return base ? { ...base, ...next } : next;
				});
			} else {
				qc.setQueryData(['folio', folder, name], (prev: unknown) => {
					const base = (prev as ParsedFolio & { id: number; mtime: number } | undefined) ?? null;
					if (!base) return prev;
					return { ...base, ...folio, mtime, warnings };
				});
			}
			invalidateIndex(qc);
		},
	});
}
