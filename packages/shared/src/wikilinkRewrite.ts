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

import { fencedLineMask } from './fences.js';

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

// Matches a leading YAML frontmatter block (`---` … `---`) at the very start
// of the document. Our frontmatter holds no wikilinks today (only type, tags,
// aliases), but peeling it off keeps the rewriter from ever touching metadata.
const FRONTMATTER_PATTERN = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

/**
 * Rewrite every `[[from.folder/from.name]]` (with or without `|alias`) in
 * `markdown` to point at `to.name`, keeping the folder and alias untouched.
 *
 * Fenced code blocks are left entirely unchanged — a `[[link]]` inside a
 * ``` block is documentation/example content, not a live reference.
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

	// Peel off a leading frontmatter block so it is never rewritten. The body
	// (everything after it) is the only region we touch.
	const fmMatch = FRONTMATTER_PATTERN.exec(markdown);
	const frontmatter = fmMatch ? fmMatch[0] : '';
	const body = fmMatch ? markdown.slice(frontmatter.length) : markdown;

	// Line by line, skipping fenced code. The mask is the parser's own
	// (`fences.ts`), so the rewriter and the section splitter agree on what is
	// code: tilde fences and an unclosed fence included. A wiki-link never
	// spans lines, so nothing is lost by not matching across them.
	const lines = body.split('\n');
	const fenced = fencedLineMask(lines);

	let rewrites = 0;
	const rewrittenBody = lines.map((line, i) => {
		if (fenced[i]) return line;
		return line.replace(pattern, (_full, _path, _pipeWithAlias, alias?: string) => {
			rewrites++;
			return alias
				? `[[${from.folder}/${to.name}|${alias}]]`
				: `[[${from.folder}/${to.name}]]`;
		});
	}).join('\n');

	return { content: frontmatter + rewrittenBody, rewrites };
}
