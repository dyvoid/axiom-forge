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
	type WikiLink,
} from '@axiom-forge/shared';

export type UnresolvedLink = BrokenLinkRef;

/**
 * Turn text typed into a link picker into a `WikiLink`. Accepts either
 * `Folder/Name` or a bare name, in which case the field's schema target
 * supplies the folder.
 */
export function parseWikiLinkText(raw: string, target?: string | string[]): WikiLink | null {
	const str = raw.trim();
	if (!str) return null;

	const parts = str.split('/');
	let folder: string;
	let name: string;

	if (parts.length > 1) {
		folder = parts[0]!;
		name = parts.slice(1).join('/');
	} else {
		name = str;
		if (Array.isArray(target) && target.length > 0) {
			folder = target[0]!;
		} else if (typeof target === 'string' && target) {
			folder = target;
		} else {
			folder = 'Unsorted';
		}
	}

	return { folder, name: name.replace(/\s+/g, '_') };
}

/**
 * Placeholder copy for a folio search input, given the field's schema target.
 * Shared so the single-value picker and the wikilink list read the same way
 * rather than each inventing a convention.
 */
export function searchPlaceholder(target?: string | string[]): string {
	const display = Array.isArray(target) ? target.join(', ') : target;
	return display ? `Search ${display}…` : 'Search folios…';
}

/**
 * True when a folio is a legal candidate for a wikilink field: inside the
 * schema target (if any) and not already selected.
 */
export function isLinkCandidate(
	folio: FolioIndexRecord,
	target: string | string[] | undefined,
	selected: ReadonlySet<string>,
): boolean {
	if (target) {
		if (Array.isArray(target) ? !target.includes(folio.folder) : folio.folder !== target) {
			return false;
		}
	}
	return !selected.has(linkKey(folio.folder, folio.name));
}

/** Stable `Folder/Name` identity for a link or folio record. */
export function linkKey(folder: string, name: string): string {
	return `${folder}/${name}`;
}

/**
 * The folder column only earns its place when the candidates can span more
 * than one folder — i.e. no target, or a multi-folder target.
 */
export function showsFolderColumn(target?: string | string[]): boolean {
	return !target || (Array.isArray(target) && target.length > 1);
}

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
