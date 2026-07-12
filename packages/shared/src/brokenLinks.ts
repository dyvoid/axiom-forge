/**
 * Reports which of a folio's outgoing wiki-links point at a non-existent
 * target. A visitor over the shared `walkFolioLinks` traversal (ADR-0007).
 *
 * Shared between the server (which checks against `projectStore.getRecord`)
 * and the client (which checks against the cached folio index).
 */

import { walkFolioLinks } from './folioWalker.js';
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

	walkFolioLinks(folio, (link, { section, field }) => {
		if (!exists(link.folder, link.name)) {
			out.push({ section, ...(field ? { field } : {}), folder: link.folder, name: link.name });
		}
	});

	return out;
}
