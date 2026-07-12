/**
 * Single source of truth for walking a folio's sections and fields to find
 * wiki-links (ADR-0007). Schema-agnostic: walks whatever `content`, `value`,
 * or `fields` are populated and invokes `visit` for each link found.
 *
 * `extractAllLinks` and `collectBrokenLinks` are visitors over this walker
 * instead of hand-written traversals, so folio-shape changes only need to
 * update this one function.
 */

import { parseWikiLinks, isWikiLink } from './wikilink.js';
import type { ParsedFolio, WikiLink } from './types.js';

export interface FolioLinkLocation {
	section: string;
	/** Undefined for top-level wikilink-list sections (no inner field name). */
	field?: string;
}

export type FolioLinkVisitor = (link: WikiLink, location: FolioLinkLocation) => void;

export function walkFolioLinks(folio: ParsedFolio, visit: FolioLinkVisitor): void {
	for (const [sectionName, section] of Object.entries(folio.sections)) {
		// Prose sections — extract inline wikilinks from content.
		if (section.content) {
			for (const link of parseWikiLinks(section.content)) {
				visit(link, { section: sectionName });
			}
		}

		// Section-level value (e.g. a top-level wikilink-list section).
		if (Array.isArray(section.value)) {
			for (const v of section.value) {
				if (isWikiLink(v)) visit(v, { section: sectionName });
			}
		} else if (isWikiLink(section.value)) {
			visit(section.value, { section: sectionName });
		}

		// Field-level values.
		if (section.fields) {
			for (const [fieldName, value] of Object.entries(section.fields)) {
				if (Array.isArray(value)) {
					for (const v of value) {
						if (isWikiLink(v)) visit(v, { section: sectionName, field: fieldName });
					}
				} else if (isWikiLink(value)) {
					visit(value, { section: sectionName, field: fieldName });
				}
			}
		}
	}
}

/**
 * Extracts all outgoing wiki-links from a parsed folio, including links
 * in prose content and structured fields.
 */
export function extractAllLinks(folio: ParsedFolio): WikiLink[] {
	const links: WikiLink[] = [];
	walkFolioLinks(folio, (link) => links.push(link));
	return links;
}
