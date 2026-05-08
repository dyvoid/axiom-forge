/**
 * TanStack Query hooks for Axiom Forge data fetching.
 */

import { useQuery } from '@tanstack/react-query';
import { fetchFolios, fetchFolio } from './client.js';

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
