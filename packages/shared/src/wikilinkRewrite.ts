/**
 * Wiki-link rewriter — used by the server's rename pipeline to update every
 * `[[Folder/OldName]]` reference across the project when a folio's filename
 * changes.
 *
 * Operates on raw markdown strings — schema-agnostic, no parsing required.
 * Preserves aliases (`[[Folder/Old|some alias]]` → `[[Folder/New|some alias]]`).
 * Folder match is case-sensitive, matching the parser's behaviour
 * (`@/parser.ts`).
 */

/**
 * Escape a string for use inside a RegExp literal — the folder and name parts
 * of a wiki-link can contain regex metacharacters in pathological cases.
 */
function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface WikiLinkRewriteTarget {
	folder: string;
	/** Filename stem — underscores, not spaces. */
	name: string;
}

export interface WikiLinkRewriteResult {
	content: string;
	/** Number of `[[…]]` occurrences that were rewritten. */
	rewrites: number;
}

/**
 * Rewrite every `[[from.folder/from.name]]` (with or without `|alias`) in
 * `markdown` to point at `to.name`, keeping the folder and alias untouched.
 */
export function rewriteWikiLinks(
	markdown: string,
	from: WikiLinkRewriteTarget,
	to: { name: string },
): WikiLinkRewriteResult {
	// Match `[[<from.folder>/<from.name>]]` or `[[<from.folder>/<from.name>|alias]]`.
	// The path segment is fully anchored to from.folder + '/' + from.name — no
	// partial matching of similar names.
	const pattern = new RegExp(
		`\\[\\[(${escapeRegex(from.folder)}/${escapeRegex(from.name)})(\\|([^\\]]+))?\\]\\]`,
		'g',
	);

	let rewrites = 0;
	const content = markdown.replace(pattern, (_full, _path, _pipeWithAlias, alias?: string) => {
		rewrites++;
		return alias
			? `[[${from.folder}/${to.name}|${alias}]]`
			: `[[${from.folder}/${to.name}]]`;
	});

	return { content, rewrites };
}
