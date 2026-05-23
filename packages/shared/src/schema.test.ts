import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { ConfigSchema, ProjectSchemaSchema, validateAgainstSchema, type ProjectSchema } from './schema.js';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '../../../fall-of-troy');

function readJson(relPath: string): unknown {
	return JSON.parse(readFileSync(resolve(projectRoot, relPath), 'utf-8'));
}

describe('seed project validates against the shared zod schemas', () => {
	it('accepts fall-of-troy/config.json', () => {
		const result = ConfigSchema.safeParse(readJson('config.json'));
		expect(result.success, JSON.stringify(result, null, 2)).toBe(true);
	});

	it('accepts fall-of-troy/schema.json', () => {
		const result = ProjectSchemaSchema.safeParse(readJson('schema.json'));
		expect(result.success, JSON.stringify(result, null, 2)).toBe(true);
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
