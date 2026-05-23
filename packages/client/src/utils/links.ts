/**
 * Client-side wiki-link helpers — thin wrapper around the shared
 * `collectBrokenLinks` walker. The shared walker is schema-agnostic and
 * parameterised on an `exists` predicate; this module supplies the predicate
 * backed by the cached folio index.
 *
 * The "index not loaded yet — don't flag" semantics live here because they
 * are a UI concern (avoid false positives during initial fetch), not part
 * of the walker's contract.
 */

import {
	collectBrokenLinks,
	type BrokenLinkRef,
	type FolioIndexRecord,
	type ParsedFolio,
} from '@axiom-forge/shared';

export type UnresolvedLink = BrokenLinkRef;

/** True when an `[[Folder/Name]]` reference points at an existing folio. */
export function isLinkResolved(
	folios: readonly FolioIndexRecord[] | undefined,
	folder: string,
	name: string,
): boolean {
	if (!folios) return true; // Index not loaded yet — don't flag false positives.
	return folios.some((f) => f.folder === folder && f.name === name);
}

/**
 * Walk every section/field of a folio and return every wikilink whose target
 * is not present in the supplied folio index.
 *
 * Returns an empty array when the index is undefined (loading) so the UI
 * doesn't flash warnings during the initial fetch.
 */
export function collectUnresolvedLinks(
	folio: ParsedFolio,
	folios: readonly FolioIndexRecord[] | undefined,
): UnresolvedLink[] {
	if (!folios) return [];
	const exists = (folder: string, name: string): boolean =>
		folios.some((f) => f.folder === folder && f.name === name);
	return collectBrokenLinks(folio, exists);
}
