import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { ConfigSchema, ProjectSchemaSchema } from './schema.js';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '../../../burden-of-the-guardian');

function readJson(relPath: string): unknown {
	return JSON.parse(readFileSync(resolve(projectRoot, relPath), 'utf-8'));
}

describe('seed project validates against the shared zod schemas', () => {
	it('accepts burden-of-the-guardian/config.json', () => {
		const result = ConfigSchema.safeParse(readJson('config.json'));
		expect(result.success, JSON.stringify(result, null, 2)).toBe(true);
	});

	it('accepts burden-of-the-guardian/schema.json', () => {
		const result = ProjectSchemaSchema.safeParse(readJson('schema.json'));
		expect(result.success, JSON.stringify(result, null, 2)).toBe(true);
	});
});
