/**
 * TanStack Query hooks for Axiom Forge data fetching.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ParsedFolio } from '@axiom-forge/shared';
import { fetchFolios, fetchFolio, putFolio } from './client.js';

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

/** Save an existing folio. */
export function useSaveFolio(folder: string, name: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ folio, clientMtime }: { folio: ParsedFolio; clientMtime: number }) =>
			putFolio(folder, name, folio, clientMtime),
		onSuccess: ({ mtime, warnings }, { folio }) => {
			qc.setQueryData(['folio', folder, name], (prev: unknown) => {
				const base = (prev as ParsedFolio & { id: number; mtime: number } | undefined) ?? null;
				if (!base) return prev;
				return { ...base, ...folio, mtime, warnings };
			});
			qc.invalidateQueries({ queryKey: ['folios'] });
		},
	});
}
