import { z } from 'zod';

// ────────────────────────────────────────────────────────────
// config.json
// ────────────────────────────────────────────────────────────

export const ConfigSchema = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	version: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

// ────────────────────────────────────────────────────────────
// schema.json
// ────────────────────────────────────────────────────────────
//
// A type's schema is a record of named sections. Each section has
// optional layout role hints and either a single `type` (for prose
// sections) or a `fields` map (for structured sections).
// ────────────────────────────────────────────────────────────

const SelectOptionSchema = z.union([
	z.string(),
	z.object({
		value: z.string(),
		inactive: z.boolean().optional(),
	}),
]);

const FieldTypeSchema = z.enum([
	'text',
	'text-list',
	'select',
	'multiselect',
	'date',
	'textarea',
	'wikilink',
	'wikilink-list',
]);

const FieldDefSchema = z.object({
	type: FieldTypeSchema,
	options: z.array(SelectOptionSchema).optional(),
	target: z.union([z.string(), z.array(z.string())]).optional(),
});

const SectionRoleSchema = z.enum(['meta', 'prose']);

/**
 * Section-level `type` is restricted to value-bearing types that round-trip
 * cleanly through the parser/serializer pair. Per-field types (text, date,
 * select, etc.) only make sense inside a `fields` map.
 *
 * This is the *type-level* home of that restriction, not just a runtime check:
 * because `SectionDefSchema` uses this enum rather than the full `FieldType`
 * set, `SectionDef['type']` is narrowed to these two values and
 * `classifySection` can be exhaustive over them.
 */
const SectionLevelTypeSchema = z.enum(['textarea', 'wikilink-list'], {
	errorMap: (_issue, ctx) => ({
		message: `Section-level \`type\` must be "textarea" or "wikilink-list" (got ${JSON.stringify(ctx.data)}). Per-field types belong inside a \`fields\` map.`,
	}),
});

const SectionDefSchema = z.object({
	role: SectionRoleSchema.optional(),
	type: SectionLevelTypeSchema.optional(),
	target: z.union([z.string(), z.array(z.string())]).optional(),
	fields: z.record(z.string(), FieldDefSchema).optional(),
}).superRefine((s, ctx) => {
	// 1. Exactly one of `fields` or `type` — they describe disjoint section shapes.
	if (Boolean(s.fields) === Boolean(s.type)) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'A section must declare exactly one of `fields` or `type`.',
		});
		return;
	}
	// 2. role: 'meta' implies a structured field section.
	if (s.role === 'meta' && !s.fields) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'A section with `role: "meta"` must declare `fields`.',
		});
	}
	// 3. role: 'prose' implies exactly `type: "textarea"`.
	if (s.role === 'prose' && s.type !== 'textarea') {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'A section with `role: "prose"` must declare `type: "textarea"`.',
		});
	}
});

const TypeDefSchema = z.object({
	icon: z.string(),
	folder: z.string(),
	sections: z.record(z.string(), SectionDefSchema),
});

export const ProjectSchemaSchema = z.object({
	version: z.string(),
	types: z.record(z.string(), TypeDefSchema),
});

export type FieldType = z.infer<typeof FieldTypeSchema>;
export type FieldDef = z.infer<typeof FieldDefSchema>;
export type SectionDef = z.infer<typeof SectionDefSchema>;
export type TypeDef = z.infer<typeof TypeDefSchema>;
export type ProjectSchema = z.infer<typeof ProjectSchemaSchema>;

// ────────────────────────────────────────────────────────────
// Section kind — the one place that decides a section's shape
// ────────────────────────────────────────────────────────────

/**
 * A section's shape, resolved from its schema definition.
 *
 * `SectionDef` models the three shapes as optional properties (`type`,
 * `fields`), which the Zod refinements above keep mutually exclusive but the
 * TypeScript type cannot express on its own. `classifySection` is the single
 * place that reads those properties; every consumer switches on `kind` and
 * gets an exhaustiveness check for free.
 *
 * Adding a fourth kind here is deliberately a compile error at every call
 * site that must handle it, rather than a silent fallthrough at one.
 */
export type ClassifiedSection =
	| { kind: 'prose' }
	| { kind: 'links'; target?: string | string[] }
	| { kind: 'fields'; fields: Record<string, FieldDef> };

/**
 * Resolve a section definition to its kind.
 *
 * @throws if the definition declares neither `fields` nor `type`. That shape is
 * rejected by `SectionDefSchema` (refinement 1) and every schema reaching a
 * consumer has been through `ProjectSchemaSchema.parse`, so reaching this is a
 * bug in the caller's construction of the schema, not bad user data — and a
 * throw is preferable to four consumers each inventing a fallback.
 */
export function classifySection(sectionDef: SectionDef): ClassifiedSection {
	if (sectionDef.fields) {
		return { kind: 'fields', fields: sectionDef.fields };
	}
	switch (sectionDef.type) {
		case 'textarea':
			return { kind: 'prose' };
		case 'wikilink-list':
			return { kind: 'links', target: sectionDef.target };
		case undefined:
			throw new Error('Invalid section definition: must declare either `fields` or `type`.');
		default: {
			const unhandled: never = sectionDef.type;
			throw new Error(`Unhandled section-level type: ${String(unhandled)}`);
		}
	}
}

// ────────────────────────────────────────────────────────────
// Save-shape validation (zod) — runs on PUT/POST request bodies
// before they are written to disk.
//
// Structural only. Does NOT enumerate type names, section names, or
// field names — those are checked separately against the live project
// schema by `validateAgainstSchema()` below. This pair keeps the
// engine schema-agnostic.
// ────────────────────────────────────────────────────────────

const WikiLinkSchema = z.object({
	folder: z.string().min(1),
	name: z.string().min(1),
	alias: z.string().optional(),
});

const FieldValueSchema = z.union([
	z.string(),
	z.array(z.string()),
	WikiLinkSchema,
	z.array(WikiLinkSchema),
	z.null(),
]);

const ParsedSectionSchema = z.object({
	content: z.string().optional(),
	value: FieldValueSchema.optional(),
	fields: z.record(z.string(), FieldValueSchema).optional(),
});

export const ParsedFolioSchema = z.object({
	// `name` is the filename stem and is *server-owned* — derived from the
	// title on save. Clients are not required to populate it (and on POST,
	// they cannot — the file doesn't exist yet). Accept any string.
	name: z.string(),
	title: z.string().min(1),
	type: z.string().min(1),
	folder: z.string().min(1),
	tags: z.array(z.string()),
	aliases: z.array(z.string()).optional(),
	sections: z.record(z.string(), ParsedSectionSchema),
	// `warnings` and `mtime` are server-side annotations, not user input —
	// accept-and-ignore rather than reject if a client sends them back.
	warnings: z.array(z.string()).optional(),
	mtime: z.number().optional(),
});

// ────────────────────────────────────────────────────────────
// Schema-conformance check — walks a save payload against the loaded
// project schema and reports problems the user must fix before the
// save can succeed. (Wikilink target resolution is reported as warnings,
// not errors — see `brokenLinks` in the server route.)
// ────────────────────────────────────────────────────────────

/**
 * Which way a folio is moving through the system. The rules are the same in
 * both directions; the severity, and one category, are not.
 *
 * - `read` — parsing a file already on disk. Lenient: schema drift that is
 *   already written down is tolerated and surfaced as a **warning**.
 * - `write` — a save the app itself is about to perform. Strict: anything
 *   non-conforming is an **error** and the save is rejected.
 *
 * That split is deliberate and load-bearing, not an artifact of the rules
 * having been written twice. See
 * [ADR-0009](../../../docs/adr/0009-consolidate-folio-validation-rules.md).
 */
export type ValidationMode = 'read' | 'write';

export type ValidationSeverity = 'warning' | 'error';

export type SchemaIssueCode =
	| 'unknown-type'
	| 'unknown-section'
	| 'unknown-field'
	| 'invalid-select-value'
	| 'wrong-shape';

export interface SchemaConformanceIssue {
	/** Dotted path to the offending element, e.g. 'sections.Vitals.fields.Mood'. */
	path: string;
	code: SchemaIssueCode;
	message: string;
	/** `warning` in `read` mode, `error` in `write` mode. */
	severity: ValidationSeverity;
}

// Forward type-only import via duck typing — types.ts depends on this file
// transitively. We declare what we need locally to keep schema.ts self-contained.
interface ValidationFolio {
	type: string;
	sections: Record<string, {
		content?: string;
		value?: unknown;
		fields?: Record<string, unknown>;
	}>;
}

function selectOptionValue(option: string | { value: string; inactive?: boolean }): string {
	return typeof option === 'string' ? option : option.value;
}

/**
 * Validate a parsed folio's *contents* against the live project schema.
 *
 * The single definition of every folio validation rule: both the read path
 * (`parseMarkdown`, which turns the issues into warning strings) and the write
 * path (`ProjectStore.validateForWrite`, which rejects the save) call this.
 * `mode` decides the severity stamped on each issue, and which rules run at
 * all — it does not change what any individual rule means.
 *
 * Returns an array of issues; empty means conforming. On the write path that
 * is the go/no-go for a save.
 *
 * This is **schema-agnostic**: it only walks whatever types/sections/fields
 * the loaded schema declares. It never names any specific type.
 */
export function validateAgainstSchema(
	folio: ValidationFolio,
	schema: ProjectSchema,
	mode: ValidationMode,
): SchemaConformanceIssue[] {
	const issues: SchemaConformanceIssue[] = [];
	const severity: ValidationSeverity = mode === 'read' ? 'warning' : 'error';

	const typeDef = schema.types[folio.type];
	if (!typeDef) {
		issues.push({
			path: 'type',
			code: 'unknown-type',
			severity,
			message: `Unknown type "${folio.type}". Not declared in schema.`,
		});
		// Without a type def we can't validate sections meaningfully — stop here.
		return issues;
	}

	for (const [sectionName, section] of Object.entries(folio.sections)) {
		const sectionDef = typeDef.sections[sectionName];
		if (!sectionDef) {
			issues.push({
				path: `sections.${sectionName}`,
				code: 'unknown-section',
				severity,
				message: `Unknown section "${sectionName}" for type "${folio.type}".`,
			});
			continue;
		}

		const classified = classifySection(sectionDef);
		switch (classified.kind) {
			case 'fields': {
				for (const [fieldName, fieldValue] of Object.entries(section.fields ?? {})) {
					const fieldDef = classified.fields[fieldName];
					if (!fieldDef) {
						issues.push({
							path: `sections.${sectionName}.fields.${fieldName}`,
							code: 'unknown-field',
							severity,
							message: `Unknown field "${fieldName}" in section "${sectionName}".`,
						});
						continue;
					}
					checkFieldValue(
						issues,
						`sections.${sectionName}.fields.${fieldName}`,
						`field "${fieldName}" in section "${sectionName}"`,
						fieldDef,
						fieldValue,
						mode,
						severity,
					);
				}
				break;
			}
			case 'prose':
				// Free text — nothing to conform to.
				break;
			case 'links':
				checkFieldValue(
					issues,
					`sections.${sectionName}.value`,
					`section "${sectionName}"`,
					{ type: 'wikilink-list', options: undefined, target: classified.target },
					section.value,
					mode,
					severity,
				);
				break;
			default: {
				const unhandled: never = classified;
				throw new Error(`Unhandled section kind: ${JSON.stringify(unhandled)}`);
			}
		}
	}

	return issues;
}

function isPlainWikiLinkObject(v: unknown): boolean {
	if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
	const o = v as Record<string, unknown>;
	return typeof o.folder === 'string' && typeof o.name === 'string';
}

/**
 * Per-field-type shape and value check. Issues come in two flavours:
 *   - `wrong-shape`: the runtime value doesn't match the declared type's
 *     expected shape (e.g. a wikilink field receiving a bare string).
 *   - `invalid-select-value`: a select/multiselect value is not in the
 *     declared options.
 *
 * `wrong-shape` is **write-only**. It asks whether a value the app is about to
 * write is well-formed, which is a question about a save payload; a file on
 * disk has already been coerced into shape by the parser, so on the read path
 * the check has nothing to say and is skipped rather than downgraded.
 *
 * Shape mismatches are reported once per field and short-circuit further
 * checks for that field.
 */
function checkFieldValue(
	issues: SchemaConformanceIssue[],
	path: string,
	label: string,
	fieldDef: FieldDef,
	value: unknown,
	mode: ValidationMode,
	severity: ValidationSeverity,
): void {
	if (value === null || value === undefined) return;

	if (mode === 'write') {
		const expectation = shapeExpectation(fieldDef.type, value);
		if (expectation) {
			issues.push({
				path,
				code: 'wrong-shape',
				severity,
				message: `${capitalize(label)} is declared ${fieldDef.type} and expects ${expectation}, got ${describeShape(value)}.`,
			});
			return;
		}
	}

	// Select/multiselect option-set check. Applies in both modes: a value
	// outside the declared options is drift on read and a rejection on write.
	if (!fieldDef.options) return;
	const allowed = fieldDef.options.map(selectOptionValue);

	const offending = fieldDef.type === 'select' && typeof value === 'string'
		? [value]
		: fieldDef.type === 'multiselect' && Array.isArray(value)
			? value.filter((v): v is string => typeof v === 'string')
			: [];

	for (const v of offending) {
		if (allowed.includes(v)) continue;
		issues.push({
			path,
			code: 'invalid-select-value',
			severity,
			message: `Invalid value "${v}" for ${label}. Allowed: ${allowed.join(', ')}.`,
		});
	}
}

/**
 * Describe what a field type expects, or `null` when `value` already matches.
 * One table so the shape rules read as a set rather than a chain of branches.
 */
function shapeExpectation(type: FieldType, value: unknown): string | null {
	const stringTypes: FieldType[] = ['text', 'date', 'select', 'textarea'];
	const stringListTypes: FieldType[] = ['text-list', 'multiselect'];

	if (stringTypes.includes(type)) {
		return typeof value === 'string' ? null : 'a string';
	}
	if (stringListTypes.includes(type)) {
		const ok = Array.isArray(value) && value.every((v) => typeof v === 'string');
		return ok ? null : 'string[]';
	}
	if (type === 'wikilink') {
		return isPlainWikiLinkObject(value) ? null : 'a { folder, name } object';
	}
	if (type === 'wikilink-list') {
		const ok = Array.isArray(value) && value.every(isPlainWikiLinkObject);
		return ok ? null : 'an array of { folder, name } objects';
	}
	return null;
}

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

function describeShape(v: unknown): string {
	if (v === null) return 'null';
	if (Array.isArray(v)) return `array(length=${v.length})`;
	return typeof v;
}

export type ParsedFolioInput = z.infer<typeof ParsedFolioSchema>;
