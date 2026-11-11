/**
 * Index filtering, shared by the Grand Index and the category index.
 *
 * Both narrow the same list by a search query and a set of tags; they differ
 * only in how the survivors are ordered. Matching goes through `scoreFolio`,
 * the one ranking definition the server's search uses too (ADR-0011).
 */

import { rankFolios, scoreFolio, type FolioIndexRecord } from '@axiom-forge/shared';

export type FolioOrder =
	/** Keep the order the folios arrived in. Search only narrows the list. */
	| 'given'
	/** Best match first while searching; by title otherwise. */
	| 'relevance';

export interface FolioFilter<T> {
	folios: readonly T[];
	query: string;
	/** A folio must carry every one of these. */
	tags: readonly string[];
	order: FolioOrder;
}

type Filterable = Pick<FolioIndexRecord, 'name' | 'title' | 'folder' | 'tags' | 'aliases' | 'snippet'>;

export function filterFolios<T extends Filterable>({ folios, query, tags, order }: FolioFilter<T>): T[] {
	const q = query.trim();
	const tagged = tags.length > 0
		? folios.filter((f) => tags.every((t) => f.tags.includes(t)))
		: [...folios];

	if (order === 'relevance') {
		return q ? rankFolios(tagged, q) : tagged.sort((a, b) => a.title.localeCompare(b.title));
	}
	return q ? tagged.filter((f) => scoreFolio(f, q) > 0) : tagged;
}

/** Every tag used across `folios`, once each, alphabetical. */
export function collectTags(folios: readonly Pick<FolioIndexRecord, 'tags'>[]): string[] {
	return Array.from(new Set(folios.flatMap((f) => f.tags))).sort();
}
