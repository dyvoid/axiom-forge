/**
 * Fenced code block detection. Shared by the parser's section splitter and the
 * write-mode validator, so the two agree on which lines are code: a `## ` line
 * inside a fence is content, never a section heading.
 */

/**
 * A fence marker: three or more backticks or tildes, indented at most three
 * spaces (CommonMark). Group 1 is the marker itself.
 */
const FENCE_MARKER = /^ {0,3}(`{3,}|~{3,})/;

/**
 * For each line, whether it belongs to a fenced code block, the opening and
 * closing fence lines included. A fence closes on a line holding only a run of
 * the same character at least as long as the one that opened it; an unclosed
 * fence runs to the end of the text.
 */
export function fencedLineMask(lines: readonly string[]): boolean[] {
	const mask: boolean[] = [];
	let fence: string | null = null;
	for (const line of lines) {
		const marker = FENCE_MARKER.exec(line)?.[1];
		if (fence === null) {
			if (marker) fence = marker;
			mask.push(fence !== null);
			continue;
		}
		mask.push(true);
		if (marker && marker[0] === fence[0] && marker.length >= fence.length && line.trim() === marker) {
			fence = null;
		}
	}
	return mask;
}

/** True when `text` has a `## ` line outside any code fence — one the parser would read as a new section. */
export function hasSectionHeading(text: string): boolean {
	const lines = text.split(/\r?\n/);
	const fenced = fencedLineMask(lines);
	return lines.some((line, i) => !fenced[i] && line.startsWith('## '));
}
