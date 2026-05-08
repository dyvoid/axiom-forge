import type { WikiLink } from './types.js';

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/;
const WIKILINK_GLOBAL_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/**
 * Parse a single `[[Folder/Name]]` or `[[Folder/Name|Alias]]` string.
 * Returns null if the input doesn't match wiki-link syntax.
 */
export function parseWikiLink(raw: string): WikiLink | null {
	const m = WIKILINK_RE.exec(raw.trim());
	if (!m) return null;
	const path = m[1]!.trim();
	const alias = m[2]?.trim();
	const slashIdx = path.indexOf('/');
	if (slashIdx === -1) return null;
	return {
		folder: path.slice(0, slashIdx),
		name: path.slice(slashIdx + 1),
		...(alias ? { alias } : {}),
	};
}

/**
 * Extract all wiki-links from a string that may contain multiple
 * `[[Folder/Name]]` references (comma-separated or one per line).
 */
export function parseWikiLinks(raw: string): WikiLink[] {
	const results: WikiLink[] = [];
	let m: RegExpExecArray | null;
	// Reset lastIndex for global regex
	WIKILINK_GLOBAL_RE.lastIndex = 0;
	while ((m = WIKILINK_GLOBAL_RE.exec(raw)) !== null) {
		const path = m[1]!.trim();
		const alias = m[2]?.trim();
		const slashIdx = path.indexOf('/');
		if (slashIdx !== -1) {
			results.push({
				folder: path.slice(0, slashIdx),
				name: path.slice(slashIdx + 1),
				...(alias ? { alias } : {}),
			});
		}
	}
	return results;
}

/** Serialize a WikiLink back to `[[Folder/Name]]` form. */
export function serializeWikiLink(link: WikiLink): string {
	return `[[${link.folder}/${link.name}]]`;
}

/** Serialize an array of WikiLinks as comma-separated `[[…]], [[…]]`. */
export function serializeWikiLinks(links: WikiLink[]): string {
	return links.map(serializeWikiLink).join(', ');
}

/** Get the human-readable display name from a WikiLink. */
export function wikiLinkDisplayName(link: WikiLink): string {
	return link.alias || link.name.replace(/_/g, ' ');
}

/** Convert a display name to the filename stem (spaces → underscores). */
export function displayNameToFilename(name: string): string {
	return name.replace(/ /g, '_');
}

/** Convert a filename stem to a display name (underscores → spaces). */
export function filenameToDisplayName(filename: string): string {
	return filename.replace(/_/g, ' ');
}
