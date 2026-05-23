/**
 * Wiki-link resolution helpers — schema-agnostic.
 *
 * The client has the folio index in memory via `useFolios()`, so resolution
 * is a pure index lookup. These helpers are lifted out of any component so
 * the read view, the edit view, and (eventually) the picker can share one
 * source of truth.
 *
 * Mirrors the server-side `collectBrokenLinks` walker in routes/folios.ts —
 * if the shape of `ParsedFolio.sections` ever changes, both walkers need
 * the same update.
 */

import { parseWikiLinks, type FolioIndexRecord, type ParsedFolio } from '@axiom-forge/shared';

export interface UnresolvedLink {
	section: string;
	/** Undefined for top-level wikilink-list sections (no inner field name). */
	field?: string;
	folder: string;
	name: string;
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

function isWikiLink(v: unknown): v is { folder: string; name: string; alias?: string } {
	return (
		!!v &&
		typeof v === 'object' &&
		'folder' in v &&
		'name' in v &&
		typeof (v as Record<string, unknown>).folder === 'string' &&
		typeof (v as Record<string, unknown>).name === 'string'
	);
}

/**
 * Walk every section/field of a folio and return every wikilink whose target
 * is not present in the supplied folio index.
 *
 * Returns an empty array when the index is undefined (loading) — see the
 * note in `isLinkResolved`.
 */
export function collectUnresolvedLinks(
	folio: ParsedFolio,
	folios: readonly FolioIndexRecord[] | undefined,
): UnresolvedLink[] {
	if (!folios) return [];
	const out: UnresolvedLink[] = [];

	for (const [sectionName, section] of Object.entries(folio.sections)) {
		// Prose sections (check inline links in content)
		if (section.content) {
			const inlineLinks = parseWikiLinks(section.content);
			for (const link of inlineLinks) {
				if (!isLinkResolved(folios, link.folder, link.name)) {
					out.push({ section: sectionName, folder: link.folder, name: link.name });
				}
			}
		}

		// Section-level value (top-level wikilink-list sections)
		if (Array.isArray(section.value)) {
			for (const v of section.value) {
				if (isWikiLink(v) && !isLinkResolved(folios, v.folder, v.name)) {
					out.push({ section: sectionName, folder: v.folder, name: v.name });
				}
			}
		} else if (isWikiLink(section.value)) {
			if (!isLinkResolved(folios, section.value.folder, section.value.name)) {
				out.push({
					section: sectionName,
					folder: section.value.folder,
					name: section.value.name,
				});
			}
		}
		// Field-level values
		if (section.fields) {
			for (const [fieldName, value] of Object.entries(section.fields)) {
				if (Array.isArray(value)) {
					for (const v of value) {
						if (isWikiLink(v) && !isLinkResolved(folios, v.folder, v.name)) {
							out.push({
								section: sectionName,
								field: fieldName,
								folder: v.folder,
								name: v.name,
							});
						}
					}
				} else if (isWikiLink(value)) {
					if (!isLinkResolved(folios, value.folder, value.name)) {
						out.push({
							section: sectionName,
							field: fieldName,
							folder: value.folder,
							name: value.name,
						});
					}
				}
			}
		}
	}
	return out;
}
