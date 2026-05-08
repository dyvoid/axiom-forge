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
