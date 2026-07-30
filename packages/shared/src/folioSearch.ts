/**
 * Single source of truth for folio search ranking (ADR-0011).
 *
 * Scoring lived in three places before this: `ProjectStore.search()` on the
 * server, plus a narrower hand-rolled copy in each of the client's two index
 * views. They had already diverged — only the server scored aliases, so an
 * alias matched in the header search and returned nothing in either index.
 *
 * Ranking belongs to the same category as parsing and validation: shared, so
 * client and server cannot disagree. This module owns the per-record score
 * only. Callers keep ownership of filtering, ordering, and limiting, because
 * those legitimately differ per surface (the Grand Index groups alphabetically,
 * a category index preserves its index order, the header dropdown takes a top-N).
 */

import type { FolioIndexRecord } from './types.js';

/**
 * The subset of a folio index record that ranking looks at. Any
 * `FolioIndexRecord` satisfies this; declaring the narrow shape keeps the
 * scorer usable for anything carrying the same fields.
 */
export type ScorableFolio = Pick<
	FolioIndexRecord,
	'name' | 'title' | 'folder' | 'tags' | 'aliases' | 'snippet'
>;

/**
 * Score a single folio against a free-text query. Returns 0 for no match, so
 * callers can filter on `> 0`.
 *
 * Scoring tiers:
 *   title/name exact     +100    alias exact         +80
 *   title/name prefix    +50     alias prefix        +40
 *   title/name contains  +10     alias contains      +8
 *   tag exact            +20     tag contains        +10
 *   folder/path contains +5      snippet contains    +1
 *
 * The title/name, alias, and tag tiers are each mutually exclusive within
 * themselves (best tier wins) but stack across categories. The folder/path
 * tier applies only when nothing else matched, so it acts as a last-resort
 * path match rather than boosting an already-ranked hit.
 *
 * `name` is compared with underscores normalised to spaces, so a query typed
 * with spaces matches the underscored filename stem.
 */
export function scoreFolio(folio: ScorableFolio, query: string): number {
	const q = query.trim().toLowerCase();
	if (!q) return 0;

	const title = folio.title.toLowerCase();
	const name = folio.name.replace(/_/g, ' ').toLowerCase();
	const folder = folio.folder.toLowerCase();
	const snippet = (folio.snippet ?? '').toLowerCase();
	const tags = folio.tags.map((t) => t.toLowerCase());
	const aliases = (folio.aliases ?? []).map((a) => a.toLowerCase());

	let score = 0;

	if (title === q || name === q) score += 100;
	else if (title.startsWith(q) || name.startsWith(q)) score += 50;
	else if (title.includes(q) || name.includes(q)) score += 10;

	// Aliases are alternative names — scored just below the primary title.
	if (aliases.some((a) => a === q)) score += 80;
	else if (aliases.some((a) => a.startsWith(q))) score += 40;
	else if (aliases.some((a) => a.includes(q))) score += 8;

	if (tags.some((t) => t === q)) score += 20;
	else if (tags.some((t) => t.includes(q))) score += 10;

	if (score === 0 && (`${folder}/${name}`.includes(q) || `${folder}/${title}`.includes(q))) {
		score += 5;
	}
	if (snippet.includes(q)) score += 1;

	return score;
}

/**
 * Rank a collection of folios against a query: score each, drop non-matches,
 * and sort by score descending with alphabetical tie-breaking on title.
 *
 * Returns every match. Limiting is the caller's decision — the server's
 * `/api/search` takes a top-N for its dropdown, while index views show all
 * matches.
 */
export function rankFolios<T extends ScorableFolio>(folios: readonly T[], query: string): T[] {
	const scored: { folio: T; score: number }[] = [];
	for (const folio of folios) {
		const score = scoreFolio(folio, query);
		if (score > 0) scored.push({ folio, score });
	}
	scored.sort((a, b) => {
		if (b.score !== a.score) return b.score - a.score;
		return a.folio.title.localeCompare(b.folio.title);
	});
	return scored.map((s) => s.folio);
}
