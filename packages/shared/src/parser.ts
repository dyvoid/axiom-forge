/**
 * Pure Markdown ↔ structured-data parser.
 *
 * Used identically on the server (for reading/writing .md files) and in the
 * client (for live validation and word counts without server round-trips).
 *
 * The parser is schema-aware: it uses the project's schema.json to decide
 * how to interpret each section (prose vs. structured fields vs. section-level
 * typed value).
 */

import * as jsYaml from 'js-yaml';
import { CORE_SCHEMA, load, dump, type Type as YamlType } from 'js-yaml';
import { classifySection, validateAgainstSchema } from './schema.js';
import type { ProjectSchema, FieldDef } from './schema.js';
import type { CoverImage, ParsedFolio, ParsedSection, FieldValue, WikiLink } from './types.js';
import { parseWikiLink, parseWikiLinks, serializeWikiLink, serializeWikiLinks } from './wikilink.js';
import { fencedLineMask } from './fences.js';

// ── Helpers ─────────────────────────────────────────────────

/**
 * Split markdown content on `## ` headers, returning [headerName, body] pairs.
 *
 * Lines inside a fenced code block are content, never headers — a `## ` in a
 * shell snippet must not start a section. A `# ` line counts as the legacy
 * title only in the preface (ADR-0022), and only the first one; anywhere else
 * it is the user's own heading and stays in the body.
 */
function splitSections(markdown: string): { h1: string; preface: string; sections: [string, string][] } {
	const lines = markdown.split(/\r?\n/);
	const fenced = fencedLineMask(lines);
	let h1: string | null = null;
	const prefaceLines: string[] = [];
	const sections: [string, string][] = [];
	let currentHeader: string | null = null;
	let currentLines: string[] = [];

	for (const [i, line] of lines.entries()) {
		const inFence = fenced[i]!;
		if (!inFence && currentHeader === null && h1 === null && line.startsWith('# ')) {
			h1 = line.slice(2).trim();
		} else if (!inFence && line.startsWith('## ')) {
			if (currentHeader !== null) {
				sections.push([currentHeader, currentLines.join('\n').trim()]);
			}
			currentHeader = line.slice(3).trim();
			currentLines = [];
		} else if (currentHeader !== null) {
			currentLines.push(line);
		} else {
			if (line.trim() !== '' || prefaceLines.length > 0) {
				prefaceLines.push(line);
			}
		}
	}
	if (currentHeader !== null) {
		sections.push([currentHeader, currentLines.join('\n').trim()]);
	}
	return { h1: h1 ?? '', preface: prefaceLines.join('\n').trim(), sections };
}

/** Parse a `- **Field Name:** value` line. Returns [fieldName, rawValue] or null. */
function parseBulletField(line: string): [string, string] | null {
	const m = /^-\s+\*\*(.+?):\*\*\s*(.*)$/.exec(line.trim());
	if (!m) return null;
	return [m[1]!, m[2]!.trim()];
}

const IMAGE_EXTENSION = /\.(?:png|jpe?g|webp|gif)$/i;

function parseCoverEmbed(line: string): CoverImage | null {
	const wikilink = /^!\[\[([^|\]]+)(?:\|([^\]]+))?\]\]$/.exec(line.trim());
	if (wikilink && IMAGE_EXTENSION.test(wikilink[1]!.trim())) {
		return {
			path: wikilink[1]!.trim(),
			...(wikilink[2]?.trim() ? { size: wikilink[2].trim() } : {}),
			syntax: 'wikilink',
		};
	}
	const markdown = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(line.trim());
	if (!markdown || !IMAGE_EXTENSION.test(markdown[2]!.trim())) return null;
	return {
		path: markdown[2]!.trim(),
		...(markdown[1]?.trim() ? { alt: markdown[1].trim() } : {}),
		syntax: 'markdown',
	};
}

function extractCoverImage(preface: string): { coverImage?: CoverImage; preface?: string } {
	const lines = preface.split(/\r?\n/);
	const index = lines.findIndex((line) => parseCoverEmbed(line) !== null);
	if (index === -1) return { preface: preface || undefined };
	const coverImage = parseCoverEmbed(lines[index]!)!;
	lines.splice(index, 1);
	const remaining = lines.join('\n').trim();
	return { coverImage, preface: remaining || undefined };
}

function serializeCoverImage(cover: CoverImage): string {
	if (cover.syntax === 'markdown') return `![${cover.alt ?? ''}](${cover.path})`;
	return `![[${cover.path}${cover.size ? `|${cover.size}` : ''}]]`;
}

// ── Field Value Parsing ─────────────────────────────────────

function parseFieldValue(raw: string, fieldDef: FieldDef): FieldValue {
	if (!raw) return null;
	switch (fieldDef.type) {
		case 'text':
		case 'date':
		case 'select':
			return raw;
		case 'text-list':
		case 'multiselect':
			return raw.split(',').map((s) => s.trim()).filter(Boolean);
		case 'wikilink':
			return parseWikiLink(raw);
		case 'wikilink-list':
			return parseWikiLinks(raw);
		case 'textarea':
			return raw;
		default:
			return raw;
	}
}

// ── Section-Level Value Parsing ─────────────────────────────

/**
 * Parse a section-level `links` body: each `- [[...]]` line is one link.
 */
function parseLinksSection(body: string): ParsedSection {
	const links: WikiLink[] = [];
	for (const line of body.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (trimmed.startsWith('- ')) {
			const linkText = trimmed.slice(2).trim();
			const parsed = parseWikiLinks(linkText);
			links.push(...parsed);
		}
	}
	return { value: links.length > 0 ? links : null };
}

// ── Field Section Parsing ───────────────────────────────────

/**
 * Parse a fields-section body into values.
 *
 * Purely structural: an unrecognised field is kept as its raw string rather
 * than dropped, so that reading stays lossless and the section still shows
 * what the file actually contains. Whether any of it *conforms* to the schema
 * is not decided here — `validateAgainstSchema` owns that, for both this path
 * and the save path. See ADR-0009.
 */
function parseFieldSection(body: string, fieldDefs: Record<string, FieldDef>): ParsedSection {
	const fields: Record<string, FieldValue> = {};

	for (const line of body.split(/\r?\n/)) {
		const parsed = parseBulletField(line);
		if (!parsed) continue;
		const [fieldName, rawValue] = parsed;
		const fieldDef = fieldDefs[fieldName];
		fields[fieldName] = fieldDef
			? parseFieldValue(rawValue, fieldDef)
			: rawValue || null;
	}
	return { fields };
}

// ── Frontmatter Parsing ─────────────────────────────────────

// Matches a leading YAML frontmatter block (`---` … `---`) at the very start
// of the document. Capturing group 1 is the YAML payload between the fences.
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * js-yaml's default schema minus implicit timestamps. The default resolves a
 * bare `2024-05-05` to a `Date`, which then stringifies as
 * "Sun May 05 2024 …" — corrupting a date-like tag on the next save, and
 * rewriting another tool's `created: 2024-05-05` as a datetime. Here such a
 * scalar stays the string it was written as. Every tag the default schema
 * understands still loads, so no file that parsed before now throws.
 */
// js-yaml 4 exports its built-in types as `types`; @types/js-yaml omits it.
const yamlTypes = (jsYaml as unknown as {
	types: Record<'merge' | 'binary' | 'omap' | 'pairs' | 'set' | 'timestamp', YamlType>;
}).types;
const FRONTMATTER_SCHEMA = CORE_SCHEMA.extend({
	implicit: [yamlTypes.merge],
	explicit: [yamlTypes.binary, yamlTypes.omap, yamlTypes.pairs, yamlTypes.set, yamlTypes.timestamp],
});

/** The frontmatter keys the app owns. Everything else is carried through as `extraFrontmatter`. */
const MANAGED_FRONTMATTER_KEYS: ReadonlySet<string> = new Set(['title', 'type', 'tags', 'aliases']);

/**
 * Split a leading YAML frontmatter block off a Markdown document.
 *
 * Returns the parsed frontmatter as a plain object (empty when there is no
 * frontmatter or it isn't a YAML mapping) and the remaining body. Only the
 * `---`-delimited block at the very start of the file is treated as
 * frontmatter, matching Obsidian's behaviour.
 *
 * Malformed YAML (syntax errors) is **not** caught — `load()` throws and the
 * caller is expected to handle it. A valid YAML payload that isn't a mapping
 * (e.g. a bare scalar or a list) is a semantic error, not a syntax one, so it
 * is surfaced as a warning string rather than thrown.
 */
function parseFrontmatter(markdown: string): {
	data: Record<string, unknown>;
	content: string;
	warning?: string;
} {
	const m = FRONTMATTER_PATTERN.exec(markdown);
	if (!m) return { data: {}, content: markdown };
	const loaded = load(m[1] ?? '', { schema: FRONTMATTER_SCHEMA });
	if (loaded && typeof loaded === 'object' && !Array.isArray(loaded)) {
		return { data: loaded as Record<string, unknown>, content: markdown.slice(m[0].length) };
	}
	// Valid YAML but not a mapping — e.g. `---\n- just\n- a\n- list\n---`.
	return {
		data: {},
		content: markdown.slice(m[0].length),
		warning: 'Frontmatter is valid YAML but not a mapping (expected key: value pairs)',
	};
}

/**
 * A YAML scalar as the trimmed string it was written as, or '' for anything
 * that is not a scalar. `title: 1984` loads as a number and is still a title.
 */
function scalarString(value: unknown): string {
	if (typeof value === 'string') return value.trim();
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return '';
}

/**
 * Coerce a raw YAML frontmatter value into a clean string list.
 *
 * Obsidian writes `tags`/`aliases` as YAML block lists, but a hand-edited
 * file may use a single scalar. Accept both: a list yields its non-empty
 * scalar entries; a scalar yields a single-element list; anything else
 * (missing/null, or an empty `- ` list item) contributes nothing.
 */
function normalizeStringList(value: unknown): string[] {
	const items = Array.isArray(value) ? value : [value];
	return items.map(scalarString).filter(Boolean);
}

// ── Main Parse Function ─────────────────────────────────────

/**
 * Parse a Markdown folio file into structured data.
 *
 * @param markdown - The raw Markdown file contents.
 * @param schema   - The project schema (needed to interpret section types).
 * @returns A ParsedFolio (without id or mtime — those are assigned by the server).
 */
export function parseMarkdown(markdown: string, schema: ProjectSchema): ParsedFolio {
	// Metadata (title, type, tags, aliases) lives in YAML frontmatter; strip it off
	// and parse sections from the remaining body. Malformed YAML throws (caller
	// handles); a non-mapping payload surfaces as a warning.
	const { data, content, warning: fmWarning } = parseFrontmatter(markdown);
	const type = scalarString(data.type);
	const tags = normalizeStringList(data.tags);
	const aliases = normalizeStringList(data.aliases);
	const extraEntries = Object.entries(data).filter(([key]) => !MANAGED_FRONTMATTER_KEYS.has(key));

	const { h1, preface: rawPreface, sections: rawSections } = splitSections(content);
	const title = scalarString(data.title) || h1;
	const { coverImage, preface } = extractCoverImage(rawPreface);

	const typeDef = schema.types[type];
	const folder = typeDef?.folder ?? '';
	const warnings: string[] = [];

	if (fmWarning) warnings.push(fmWarning);

	const sections: Record<string, ParsedSection> = {};

	for (const [sectionName, body] of rawSections) {
		if (!typeDef) {
			sections[sectionName] = { content: body || undefined };
			continue;
		}
		const sectionDef = typeDef.sections[sectionName];
		if (!sectionDef) {
			// Kept, not dropped — reading is lossless. `validateAgainstSchema`
			// below reports it.
			sections[sectionName] = { content: body || undefined };
			continue;
		}

		const classified = classifySection(sectionDef);
		switch (classified.kind) {
			case 'fields':
				sections[sectionName] = parseFieldSection(body, classified.fields);
				break;
			case 'prose':
				sections[sectionName] = { content: body || undefined };
				break;
			case 'links':
				sections[sectionName] = parseLinksSection(body);
				break;
			default: {
				const unhandled: never = classified;
				throw new Error(`Unhandled section kind: ${JSON.stringify(unhandled)}`);
			}
		}
	}

	// Schema conformance, in read mode: the same rule engine the save path runs,
	// reporting warnings instead of errors. A file with no `type` at all is not
	// held against the schema — there is nothing to hold it against, and a
	// typeless file is a different problem from a non-conforming one.
	if (type) {
		for (const issue of validateAgainstSchema({ type, sections }, schema, 'read')) {
			warnings.push(issue.message);
		}
	}

	return {
		// `name` is the filename stem (the folio's ID). The parser only sees file
		// content, not the filename, so callers (server `getFolio`, etc.) overlay it.
		name: '',
		title,
		type,
		folder,
		tags,
		aliases: aliases.length > 0 ? aliases : undefined,
		preface,
		coverImage,
		sections,
		...(extraEntries.length > 0 ? { extraFrontmatter: Object.fromEntries(extraEntries) } : {}),
		warnings,
	};
}

// ── Serialization ───────────────────────────────────────────

function serializeFieldValue(value: FieldValue, fieldDef: FieldDef): string {
	if (value === null || value === undefined) return '';
	switch (fieldDef.type) {
		case 'text':
		case 'date':
		case 'select':
			return String(value);
		case 'text-list':
		case 'multiselect':
			return Array.isArray(value) ? (value as string[]).join(', ') : String(value);
		case 'wikilink':
			return serializeWikiLink(value as WikiLink);
		case 'wikilink-list':
			return serializeWikiLinks(value as WikiLink[]);
		case 'textarea':
			return String(value);
		default:
			return String(value);
	}
}

/**
 * The single definition of "this field has nothing in it".
 *
 * Shared deliberately: the serializer uses it to decide what reaches disk and
 * the read view uses it to decide what renders. Two copies could drift into
 * omitting a field from the file while still showing it on screen, or the
 * reverse. See [ADR-0021](../../../docs/adr/0021-section-kind-union.md).
 */
export function isFieldValueEmpty(value: FieldValue | undefined): boolean {
	if (value === null || value === undefined || value === '') return true;
	if (Array.isArray(value) && value.length === 0) return true;
	return false;
}

/**
 * Build the YAML frontmatter block (`---`…`---`) for a folio.
 *
 * `title` and `type` are always present. `tags` and `aliases` are emitted as
 * YAML block lists and omitted entirely when empty (mirroring the empty-field
 * omission rule for the body). `lineWidth: -1` disables line wrapping so that
 * long values stay on one line — wrapping would otherwise threaten round-trip
 * idempotency. js-yaml handles all escaping/quoting.
 *
 * Properties the app does not manage follow the managed ones, dumped with the
 * same schema they were loaded with, so a date-like string another tool wrote
 * (`created: 2024-05-05`) goes back out unquoted, exactly as it came in.
 *
 * The returned string ends with a blank line, so it can be concatenated
 * directly with the Markdown body.
 */
function serializeFrontmatter(folio: ParsedFolio): string {
	const data: Record<string, unknown> = { title: folio.title, type: folio.type };
	if (folio.tags.length > 0) data.tags = folio.tags;
	if (folio.aliases && folio.aliases.length > 0) data.aliases = folio.aliases;
	const extra = Object.fromEntries(
		Object.entries(folio.extraFrontmatter ?? {}).filter(([key]) => !MANAGED_FRONTMATTER_KEYS.has(key)),
	);
	const extraYaml = Object.keys(extra).length > 0
		? dump(extra, { lineWidth: -1, schema: FRONTMATTER_SCHEMA, skipInvalid: true })
		: '';
	return `---\n${dump(data, { lineWidth: -1 })}${extraYaml}---\n\n`;
}

/**
 * Serialize a ParsedFolio back to Markdown.
 *
 * @param folio  - The structured folio data.
 * @param schema - The project schema (for section ordering and field types).
 * @returns The Markdown string ready to write to disk.
 */
export function serializeToMarkdown(folio: ParsedFolio, schema: ProjectSchema): string {
	const lines: string[] = [];
	const appendBlock = (...block: string[]): void => {
		if (lines.length > 0) lines.push('');
		lines.push(...block);
	};

	if (folio.coverImage) {
		appendBlock(serializeCoverImage(folio.coverImage));
	}

	if (folio.preface) {
		appendBlock(folio.preface);
	}

	const typeDef = schema.types[folio.type];
	if (typeDef) {
		// Iterate sections in schema declaration order
		for (const [sectionName, sectionDef] of Object.entries(typeDef.sections)) {
			const section = folio.sections[sectionName];
			if (!section) continue;

			const classified = classifySection(sectionDef);
			switch (classified.kind) {
				case 'fields': {
					// Structured field section — only write if at least one field has content
					const fieldEntries: string[] = [];
					for (const [fieldName, fieldDef] of Object.entries(classified.fields)) {
						const value = section.fields?.[fieldName];
						if (isFieldValueEmpty(value)) continue;
						fieldEntries.push(`- **${fieldName}:** ${serializeFieldValue(value!, fieldDef)}`);
					}
					if (fieldEntries.length === 0) continue;
					appendBlock(`## ${sectionName}`, ...fieldEntries);
					break;
				}
				case 'prose': {
					if (!section.content) continue;
					appendBlock(`## ${sectionName}`, section.content);
					break;
				}
				case 'links': {
					const links = section.value as WikiLink[] | null;
					if (!links || links.length === 0) continue;
					appendBlock(`## ${sectionName}`, ...links.map((link) => `- ${serializeWikiLink(link)}`));
					break;
				}
				default: {
					const unhandled: never = classified;
					throw new Error(`Unhandled section kind: ${JSON.stringify(unhandled)}`);
				}
			}
		}
	}

	const body = lines.length > 0 ? `${lines.join('\n')}\n` : '';
	return serializeFrontmatter(folio) + body;
}
