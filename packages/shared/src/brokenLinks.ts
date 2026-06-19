/**
 * Single source of truth for walking a folio's outgoing wiki-links and
 * reporting which ones point at a non-existent target.
 *
 * Schema-agnostic: walks whatever sections/fields are populated, asks the
 * supplied `exists` predicate, and collects the misses.
 *
 * Shared between the server (which checks against `projectStore.getRecord`)
 * and the client (which checks against the cached folio index).
 */

import { parseWikiLinks, isWikiLink } from './wikilink.js';
import type { ParsedFolio } from './types.js';

export interface BrokenLinkRef {
	section: string;
	/** Undefined for top-level wikilink-list sections (no inner field name). */
	field?: string;
	folder: string;
	name: string;
}

export function collectBrokenLinks(
	folio: ParsedFolio,
	exists: (folder: string, name: string) => boolean,
): BrokenLinkRef[] {
	const out: BrokenLinkRef[] = [];

	for (const [sectionName, section] of Object.entries(folio.sections)) {
		// Prose sections — extract inline wikilinks from content.
		if (section.content) {
			for (const link of parseWikiLinks(section.content)) {
				if (!exists(link.folder, link.name)) {
					out.push({ section: sectionName, folder: link.folder, name: link.name });
				}
			}
		}

		// Section-level value (e.g. a top-level wikilink-list section).
		if (Array.isArray(section.value)) {
			for (const v of section.value) {
				if (isWikiLink(v) && !exists(v.folder, v.name)) {
					out.push({ section: sectionName, folder: v.folder, name: v.name });
				}
			}
		} else if (isWikiLink(section.value)) {
			if (!exists(section.value.folder, section.value.name)) {
				out.push({
					section: sectionName,
					folder: section.value.folder,
					name: section.value.name,
				});
			}
		}

		// Field-level values.
		if (section.fields) {
			for (const [fieldName, value] of Object.entries(section.fields)) {
				if (Array.isArray(value)) {
					for (const v of value) {
						if (isWikiLink(v) && !exists(v.folder, v.name)) {
							out.push({
								section: sectionName,
								field: fieldName,
								folder: v.folder,
								name: v.name,
							});
						}
					}
				} else if (isWikiLink(value)) {
					if (!exists(value.folder, value.name)) {
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
