import { z } from 'zod';

// ────────────────────────────────────────────────────────────
// config.json
// ────────────────────────────────────────────────────────────

export const ConfigSchema = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	version: z.string().optional(),
	theme: z
		.object({
			accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
		})
		.optional(),
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
	target: z.string().optional(),
});

const SectionRoleSchema = z.enum(['meta', 'prose']);

const SectionDefSchema = z.object({
	role: SectionRoleSchema.optional(),
	type: FieldTypeSchema.optional(),
	target: z.string().optional(),
	fields: z.record(z.string(), FieldDefSchema).optional(),
}).refine(
	(s) => Boolean(s.fields) !== Boolean(s.type),
	{ message: 'A section must declare exactly one of `fields` or `type`.' },
);

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

export interface SchemaConformanceIssue {
	/** Dotted path to the offending element, e.g. 'sections.Vitals.fields.Mood'. */
	path: string;
	/** Machine code: 'unknown-type' | 'unknown-section' | 'unknown-field' | 'invalid-select-value' | 'wrong-shape'. */
	code: string;
	message: string;
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
 * Returns an array of issues — empty array means OK to save.
 *
 * This is **schema-agnostic**: it only walks whatever types/sections/fields
 * the loaded schema declares. It never names any specific type.
 */
export function validateAgainstSchema(
	folio: ValidationFolio,
	schema: ProjectSchema,
): SchemaConformanceIssue[] {
	const issues: SchemaConformanceIssue[] = [];

	const typeDef = schema.types[folio.type];
	if (!typeDef) {
		issues.push({
			path: 'type',
			code: 'unknown-type',
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
				message: `Unknown section "${sectionName}" for type "${folio.type}".`,
			});
			continue;
		}

		// Validate field-based sections
		if (sectionDef.fields) {
			if (section.fields) {
				for (const [fieldName, fieldValue] of Object.entries(section.fields)) {
					const fieldDef = sectionDef.fields[fieldName];
					if (!fieldDef) {
						issues.push({
							path: `sections.${sectionName}.fields.${fieldName}`,
							code: 'unknown-field',
							message: `Unknown field "${fieldName}" in section "${sectionName}".`,
						});
						continue;
					}
					checkSelectValue(issues, `sections.${sectionName}.fields.${fieldName}`, fieldName, fieldDef, fieldValue);
				}
			}
		} else if (sectionDef.type) {
			// Section with a top-level type — validate its `value` (select/multiselect only).
			const path = `sections.${sectionName}.value`;
			checkSelectValue(issues, path, sectionName, { type: sectionDef.type, options: undefined, target: sectionDef.target }, section.value);
		}
	}

	return issues;
}

function checkSelectValue(
	issues: SchemaConformanceIssue[],
	path: string,
	label: string,
	fieldDef: FieldDef,
	value: unknown,
): void {
	if (value === null || value === undefined) return;
	if (fieldDef.type === 'select' && typeof value === 'string' && fieldDef.options) {
		const allowed = fieldDef.options.map(selectOptionValue);
		if (!allowed.includes(value)) {
			issues.push({
				path,
				code: 'invalid-select-value',
				message: `Invalid value "${value}" for "${label}". Allowed: ${allowed.join(', ')}.`,
			});
		}
	}
	if (fieldDef.type === 'multiselect' && Array.isArray(value) && fieldDef.options) {
		const allowed = fieldDef.options.map(selectOptionValue);
		for (const v of value) {
			if (typeof v === 'string' && !allowed.includes(v)) {
				issues.push({
					path,
					code: 'invalid-select-value',
					message: `Invalid value "${v}" for "${label}". Allowed: ${allowed.join(', ')}.`,
				});
			}
		}
	}
}

export type ParsedFolioInput = z.infer<typeof ParsedFolioSchema>;
