/**
 * TanStack Query hooks for Axiom Forge data fetching.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { ParsedFolio } from '@axiom-forge/shared';
import { fetchFolios, fetchFolio, putFolio, postFolio, deleteFolio, fetchWarnings } from './client.js';

/** Schema parse warnings across all project files — fetched once at startup. */
export function useWarnings() {
	return useQuery({
		queryKey: ['warnings'],
		queryFn: fetchWarnings,
		staleTime: Infinity,
	});
}

/** All folio index records — drives the sidebar. */
export function useFolios() {
	return useQuery({
		queryKey: ['folios'],
		queryFn: fetchFolios,
		staleTime: 30_000,
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
			qc.invalidateQueries({ queryKey: ['folios'] });
			qc.invalidateQueries({ queryKey: ['warnings'] });
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
		mutationFn: ({ folder, name }: { folder: string; name: string }) =>
			deleteFolio(folder, name),
		onSuccess: (_, { folder, name }) => {
			qc.removeQueries({ queryKey: ['folio', folder, name] });
			qc.invalidateQueries({ queryKey: ['folios'] });
			qc.invalidateQueries({ queryKey: ['warnings'] });
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
				// File was renamed on disk — drop the stale cache entry under the
				// old name, seed the new key, then refresh the sidebar.
				qc.removeQueries({ queryKey: ['folio', folder, name] });
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
			qc.invalidateQueries({ queryKey: ['folios'] });
			qc.invalidateQueries({ queryKey: ['warnings'] });
		},
	});
}
