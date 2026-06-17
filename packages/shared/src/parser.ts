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

import { load, dump } from 'js-yaml';
import type { ProjectSchema, SectionDef, FieldDef, FieldType } from './schema.js';
import type { ParsedFolio, ParsedSection, FieldValue, WikiLink } from './types.js';
import { parseWikiLink, parseWikiLinks, serializeWikiLink, serializeWikiLinks } from './wikilink.js';

// ── Helpers ─────────────────────────────────────────────────

/** Split markdown content on `## ` headers, returning [headerName, body] pairs. */
function splitSections(markdown: string): { h1: string; preface: string; sections: [string, string][] } {
	const lines = markdown.split(/\r?\n/);
	let h1 = '';
	const prefaceLines: string[] = [];
	const sections: [string, string][] = [];
	let currentHeader: string | null = null;
	let currentLines: string[] = [];

	for (const line of lines) {
		if (line.startsWith('# ')) {
			h1 = line.slice(2).trim();
		} else if (line.startsWith('## ')) {
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
	return { h1, preface: prefaceLines.join('\n').trim(), sections };
}

/** Parse a `- **Field Name:** value` line. Returns [fieldName, rawValue] or null. */
function parseBulletField(line: string): [string, string] | null {
	const m = /^-\s+\*\*(.+?):\*\*\s*(.*)$/.exec(line.trim());
	if (!m) return null;
	return [m[1]!, m[2]!.trim()];
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
 * Parse a section that has a `type` at the section level (no `fields`).
 * For textarea: body is free prose.
 * For wikilink-list: each `- [[...]]` line is one link.
 */
function parseSectionLevelValue(body: string, sectionDef: SectionDef): ParsedSection {
	const type = sectionDef.type as FieldType;
	if (type === 'textarea') {
		return { content: body || undefined };
	}
	if (type === 'wikilink-list') {
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
	// Fallback: treat as text content
	return { content: body || undefined };
}

// ── Field Section Parsing ───────────────────────────────────

function parseFieldSection(body: string, sectionDef: SectionDef, sectionName: string, warnings: string[]): ParsedSection {
	const fields: Record<string, FieldValue> = {};
	const fieldDefs = sectionDef.fields ?? {};

	for (const line of body.split(/\r?\n/)) {
		const parsed = parseBulletField(line);
		if (!parsed) continue;
		const [fieldName, rawValue] = parsed;
		const fieldDef = fieldDefs[fieldName];
		if (fieldDef) {
			fields[fieldName] = parseFieldValue(rawValue, fieldDef);
			if (rawValue && fieldDef.options) {
				const optionValues = fieldDef.options.map(o => typeof o === 'string' ? o : o.value);
				const values = (fieldDef.type === 'multiselect')
					? rawValue.split(',').map(s => s.trim()).filter(Boolean)
					: [rawValue];
				for (const v of values) {
					if (!optionValues.includes(v)) {
						warnings.push(`Invalid value "${v}" for ${fieldDef.type} field "${fieldName}" in section "${sectionName}" (options: ${optionValues.join(', ')})`);
					}
				}
			}
		} else {
			warnings.push(`Unknown field "${fieldName}" in section "${sectionName}"`);
			fields[fieldName] = rawValue || null;
		}
	}
	return { fields };
}

// ── Frontmatter Parsing ─────────────────────────────────────

// Matches a leading YAML frontmatter block (`---` … `---`) at the very start
// of the document. Capturing group 1 is the YAML payload between the fences.
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * Split a leading YAML frontmatter block off a Markdown document.
 *
 * Returns the parsed frontmatter as a plain object (empty when there is no
 * frontmatter or it isn't a YAML mapping) and the remaining body. Only the
 * `---`-delimited block at the very start of the file is treated as
 * frontmatter, matching Obsidian's behaviour.
 */
function parseFrontmatter(markdown: string): { data: Record<string, unknown>; content: string } {
	const m = FRONTMATTER_PATTERN.exec(markdown);
	if (!m) return { data: {}, content: markdown };
	const loaded = load(m[1] ?? '');
	const data =
		loaded && typeof loaded === 'object' && !Array.isArray(loaded)
			? (loaded as Record<string, unknown>)
			: {};
	return { data, content: markdown.slice(m[0].length) };
}

/**
 * Coerce a raw YAML frontmatter value into a clean string list.
 *
 * Obsidian writes `tags`/`aliases` as YAML block lists, but a hand-edited
 * file may use a single scalar. Accept both: a list yields its trimmed
 * non-empty entries; a scalar yields a single-element list; anything else
 * (missing/null) yields an empty list.
 */
function normalizeStringList(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.map((v) => String(v).trim()).filter(Boolean);
	}
	if (typeof value === 'string') {
		const trimmed = value.trim();
		return trimmed ? [trimmed] : [];
	}
	return [];
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
	// Metadata (type, tags, aliases) lives in YAML frontmatter; strip it off and
	// parse sections from the remaining body.
	const { data, content } = parseFrontmatter(markdown);
	const type = typeof data.type === 'string' ? data.type : '';
	const tags = normalizeStringList(data.tags);
	const aliases = normalizeStringList(data.aliases);

	const { h1, preface, sections: rawSections } = splitSections(content);

	const typeDef = schema.types[type];
	const folder = typeDef?.folder ?? '';
	const warnings: string[] = [];

	if (type && !typeDef) {
		warnings.push(`Unknown type "${type}" — no schema definition found`);
	}

	const sections: Record<string, ParsedSection> = {};

	for (const [sectionName, body] of rawSections) {
		if (!typeDef) {
			sections[sectionName] = { content: body || undefined };
			continue;
		}
		const sectionDef = typeDef.sections[sectionName];
		if (!sectionDef) {
			warnings.push(`Unknown section "${sectionName}"`);
			sections[sectionName] = { content: body || undefined };
			continue;
		}

		if (sectionDef.fields) {
			sections[sectionName] = parseFieldSection(body, sectionDef, sectionName, warnings);
		} else {
			sections[sectionName] = parseSectionLevelValue(body, sectionDef);
		}
	}

	return {
		// `name` is the filename stem (the folio's ID). The parser only sees file
		// content, not the filename, so callers (server `getFolio`, etc.) overlay it.
		name: '',
		title: h1,
		type,
		folder,
		tags,
		aliases: aliases.length > 0 ? aliases : undefined,
		preface: preface || undefined,
		sections,
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

function isFieldValueEmpty(value: FieldValue | undefined): boolean {
	if (value === null || value === undefined || value === '') return true;
	if (Array.isArray(value) && value.length === 0) return true;
	return false;
}

/**
 * Build the YAML frontmatter block (`---`…`---`) for a folio.
 *
 * `type` is always present. `tags` and `aliases` are emitted as YAML block
 * lists and omitted entirely when empty (mirroring the empty-field omission
 * rule for the body). `lineWidth: -1` disables line wrapping so that long
 * values stay on one line — wrapping would otherwise threaten round-trip
 * idempotency. js-yaml handles all escaping/quoting.
 *
 * The returned string ends with a blank line, so it can be concatenated
 * directly with a body that begins at the H1.
 */
function serializeFrontmatter(folio: ParsedFolio): string {
	const data: Record<string, unknown> = { type: folio.type };
	if (folio.tags.length > 0) data.tags = folio.tags;
	if (folio.aliases && folio.aliases.length > 0) data.aliases = folio.aliases;
	return `---\n${dump(data, { lineWidth: -1 })}---\n\n`;
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

	// H1 title (display name — separate from filename). Each block below pushes
	// its own leading blank line, so the H1 itself adds none.
	lines.push(`# ${folio.title}`);

	if (folio.preface) {
		lines.push('');
		lines.push(folio.preface);
	}

	const typeDef = schema.types[folio.type];
	if (typeDef) {
		// Iterate sections in schema declaration order
		for (const [sectionName, sectionDef] of Object.entries(typeDef.sections)) {
			const section = folio.sections[sectionName];
			if (!section) continue;

			if (sectionDef.fields) {
				// Structured field section — only write if at least one field has content
				const fieldEntries: string[] = [];
				for (const [fieldName, fieldDef] of Object.entries(sectionDef.fields)) {
					const value = section.fields?.[fieldName];
					if (isFieldValueEmpty(value)) continue;
					fieldEntries.push(`- **${fieldName}:** ${serializeFieldValue(value!, fieldDef)}`);
				}
				if (fieldEntries.length === 0) continue;
				lines.push('');
				lines.push(`## ${sectionName}`);
				lines.push(...fieldEntries);
			} else if (sectionDef.type === 'textarea') {
				// Textarea / prose section
				if (!section.content) continue;
				lines.push('');
				lines.push(`## ${sectionName}`);
				lines.push(section.content);
			} else if (sectionDef.type === 'wikilink-list') {
				// Section-level wikilink-list
				const links = section.value as WikiLink[] | null;
				if (!links || links.length === 0) continue;
				lines.push('');
				lines.push(`## ${sectionName}`);
				for (const link of links) {
					lines.push(`- ${serializeWikiLink(link)}`);
				}
			}
		}
	}

	const body = lines.join('\n') + '\n';
	return serializeFrontmatter(folio) + body;
}
