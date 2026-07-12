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

/** Serialize a WikiLink back to `[[Folder/Name]]` or `[[Folder/Name|Alias]]` form. */
export function serializeWikiLink(link: WikiLink): string {
	return link.alias
		? `[[${link.folder}/${link.name}|${link.alias}]]`
		: `[[${link.folder}/${link.name}]]`;
}

/** Serialize an array of WikiLinks as comma-separated `[[…]], [[…]]`. */
export function serializeWikiLinks(links: WikiLink[]): string {
	return links.map(serializeWikiLink).join(', ');
}

/** Get the human-readable display name from a WikiLink. */
export function wikiLinkDisplayName(link: WikiLink): string {
	return link.alias || link.name.replace(/_/g, ' ');
}

/**
 * Convert a display title to a URL-safe filename stem.
 * Strips quotes/apostrophes, replaces non-letter/digit chars with underscores,
 * collapses repeats, trims leading/trailing underscores.
 */
export function displayNameToFilename(title: string): string {
	return title
		.normalize('NFC')
		.replace(/[''""`]/g, '')
		.replace(/[^\p{L}\p{N}\s_-]/gu, '_')
		.replace(/\s+/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_+|_+$/g, '');
}

/** Convert a filename stem to a fallback display name (underscores → spaces). */
export function filenameToDisplayName(filename: string): string {
	return filename.replace(/_/g, ' ');
}

/** Type guard for a structured wiki-link value (has string `folder` and `name`). */
export function isWikiLink(v: unknown): v is WikiLink {
	return !!v && typeof v === 'object' && 'folder' in v && 'name' in v
		&& typeof (v as Record<string, unknown>).folder === 'string'
		&& typeof (v as Record<string, unknown>).name === 'string';
}
