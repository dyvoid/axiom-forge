import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { ConfigSchema, ProjectSchemaSchema, classifySection, validateAgainstSchema, type ProjectSchema, type SectionDef } from './schema.js';
import { parseMarkdown, serializeToMarkdown } from './parser.js';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '../../../fall-of-troy');

function readJson(relPath: string): unknown {
	return JSON.parse(readFileSync(resolve(projectRoot, relPath), 'utf-8'));
}

// Established exception to the synthetic-schemas rule (see AGENTS.md): reads
// fall-of-troy/ to smoke-test that the sample project files stay valid against
// the Zod schemas as they evolve. Asserts only `result.success` — no specific
// type names or field values from the sample project.
describe('seed project validates against the shared zod schemas', () => {
	it('accepts fall-of-troy/config.json', () => {
		const result = ConfigSchema.safeParse(readJson('config.json'));
		expect(result.success, JSON.stringify(result, null, 2)).toBe(true);
	});

	it('accepts fall-of-troy/schema.json', () => {
		const result = ProjectSchemaSchema.safeParse(readJson('schema.json'));
		expect(result.success, JSON.stringify(result, null, 2)).toBe(true);
	});

	// The two checks above only ever validated the JSON. Every .md file in the
	// sample project went unparsed, so sample content could drift out of sync
	// with the schema — or a parser change could start warning on it — and the
	// suite stayed green. Parsing them here closes that.
	//
	// Stays within the synthetic-schemas exception in AGENTS.md: this asserts
	// only that the files parse cleanly, never a specific type name or field
	// value from the sample project.
	it('parses every fall-of-troy Markdown file without warnings', () => {
		const schema = ProjectSchemaSchema.parse(readJson('schema.json'));
		const folders = Object.values(schema.types).map((t) => t.folder);

		const offenders: string[] = [];
		let parsed = 0;

		for (const folder of folders) {
			const dir = resolve(projectRoot, folder);
			for (const entry of readdirSync(dir)) {
				if (!entry.endsWith('.md')) continue;
				parsed++;
				const markdown = readFileSync(resolve(dir, entry), 'utf-8');
				const warnings = parseMarkdown(markdown, schema).warnings ?? [];
				if (warnings.length > 0) offenders.push(`${folder}/${entry}: ${warnings.join('; ')}`);
			}
		}

		expect(parsed, 'expected the sample project to contain Markdown files').toBeGreaterThan(0);
		expect(offenders, offenders.join('\n')).toEqual([]);
	});

	// Round-trip fidelity on real content: serializing a parsed folio and
	// re-parsing it must preserve every value. The existing round-trip tests all
	// use constructed fixtures, so nothing covered the shapes the sample actually
	// uses (section-level lists, multiselects, frontmatter aliases).
	//
	// Compared order-insensitively on purpose. `serializeToMarkdown` walks the
	// schema's declaration order, so a file whose fields are written in a
	// different order comes back reordered — that is intended normalisation, not
	// data loss. Helen.md is the live example: it lists Spouse before Divine
	// Patron, the schema declares the reverse.
	it('round-trips every fall-of-troy Markdown file', () => {
		const schema = ProjectSchemaSchema.parse(readJson('schema.json'));

		/** Deep-sort object keys so comparison ignores declaration order. */
		const ordered = (value: unknown): unknown => {
			if (Array.isArray(value)) return value.map(ordered);
			if (value && typeof value === 'object') {
				return Object.fromEntries(
					Object.entries(value as Record<string, unknown>)
						.sort(([a], [b]) => a.localeCompare(b))
						.map(([k, v]) => [k, ordered(v)]),
				);
			}
			return value;
		};

		const unstable: string[] = [];
		for (const folder of Object.values(schema.types).map((t) => t.folder)) {
			const dir = resolve(projectRoot, folder);
			for (const entry of readdirSync(dir)) {
				if (!entry.endsWith('.md')) continue;
				const first = parseMarkdown(readFileSync(resolve(dir, entry), 'utf-8'), schema);
				const second = parseMarkdown(serializeToMarkdown(first, schema), schema);
				if (JSON.stringify(ordered(second.sections)) !== JSON.stringify(ordered(first.sections))) {
					unstable.push(`${folder}/${entry}`);
				}
			}
		}

		expect(unstable, `unstable round-trip: ${unstable.join(', ')}`).toEqual([]);
	});
});

describe('SectionDefSchema constraints', () => {
	const wrapSection = (section: unknown): unknown => ({
		version: '1.0.0',
		types: { Thing: { icon: 'x', folder: 'Things', sections: { S: section } } },
	});

	it('rejects role: meta without fields', () => {
		const result = ProjectSchemaSchema.safeParse(wrapSection({ role: 'meta', type: 'textarea' }));
		expect(result.success).toBe(false);
	});

	it('rejects role: prose with non-textarea type', () => {
		const result = ProjectSchemaSchema.safeParse(wrapSection({ role: 'prose', type: 'wikilink-list' }));
		expect(result.success).toBe(false);
	});

	it('rejects section-level type other than textarea or wikilink-list', () => {
		const result = ProjectSchemaSchema.safeParse(wrapSection({ type: 'select', options: ['a'] }));
		expect(result.success).toBe(false);
	});

	it('accepts a valid meta section', () => {
		const result = ProjectSchemaSchema.safeParse(wrapSection({ role: 'meta', fields: { Name: { type: 'text' } } }));
		expect(result.success).toBe(true);
	});

	it('accepts a valid prose section', () => {
		const result = ProjectSchemaSchema.safeParse(wrapSection({ role: 'prose', type: 'textarea' }));
		expect(result.success).toBe(true);
	});

	it('accepts an unroled section-level wikilink-list', () => {
		const result = ProjectSchemaSchema.safeParse(wrapSection({ type: 'wikilink-list', target: 'Things' }));
		expect(result.success).toBe(true);
	});
});

describe('validateAgainstSchema wrong-shape detection', () => {
	const schema: ProjectSchema = {
		version: '1.0.0',
		types: {
			Thing: {
				icon: 'x',
				folder: 'Things',
				sections: {
					Vitals: {
						fields: {
							Name: { type: 'text' },
							Friends: { type: 'wikilink-list', target: 'Things' },
							Best: { type: 'wikilink', target: 'Things' },
						},
					},
				},
			},
		},
	};

	it('flags a string in a wikilink field', () => {
		const issues = validateAgainstSchema(
			{ type: 'Thing', sections: { Vitals: { fields: { Best: 'not-an-object' } } } },
			schema,
		);
		expect(issues).toHaveLength(1);
		expect(issues[0]!.code).toBe('wrong-shape');
	});

	it('flags an array in a text field', () => {
		const issues = validateAgainstSchema(
			{ type: 'Thing', sections: { Vitals: { fields: { Name: ['a', 'b'] } } } },
			schema,
		);
		expect(issues).toHaveLength(1);
		expect(issues[0]!.code).toBe('wrong-shape');
	});

	it('flags strings inside a wikilink-list', () => {
		const issues = validateAgainstSchema(
			{ type: 'Thing', sections: { Vitals: { fields: { Friends: ['oops'] } } } },
			schema,
		);
		expect(issues).toHaveLength(1);
		expect(issues[0]!.code).toBe('wrong-shape');
	});

	it('passes valid shapes', () => {
		const issues = validateAgainstSchema(
			{
				type: 'Thing',
				sections: {
					Vitals: {
						fields: {
							Name: 'Telamonas',
							Best: { folder: 'Things', name: 'Arion' },
							Friends: [{ folder: 'Things', name: 'Arion' }],
						},
					},
				},
			},
			schema,
		);
		expect(issues).toEqual([]);
	});
});

describe('classifySection', () => {
	it('classifies a fields section and hands back its field map', () => {
		const def: SectionDef = { role: 'meta', fields: { Name: { type: 'text' } } };
		const classified = classifySection(def);
		expect(classified.kind).toBe('fields');
		if (classified.kind !== 'fields') throw new Error('expected fields');
		expect(Object.keys(classified.fields)).toEqual(['Name']);
	});

	it('classifies a textarea section as prose', () => {
		expect(classifySection({ role: 'prose', type: 'textarea' })).toEqual({ kind: 'prose' });
	});

	it('classifies a wikilink-list section as links and carries its target', () => {
		expect(classifySection({ type: 'wikilink-list', target: 'Things' }))
			.toEqual({ kind: 'links', target: 'Things' });
	});

	it('prefers fields when a malformed def carries both', () => {
		// Zod rejects this shape, so it cannot arrive from a loaded schema — the
		// assertion pins the precedence rather than blessing the shape.
		const def = { type: 'textarea', fields: { Name: { type: 'text' } } } as SectionDef;
		expect(classifySection(def).kind).toBe('fields');
	});

	it('throws on a def declaring neither fields nor type', () => {
		expect(() => classifySection({} as SectionDef)).toThrow(/must declare either/);
	});
});
