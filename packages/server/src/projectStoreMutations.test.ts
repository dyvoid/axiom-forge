/**
 * Direct unit tests for ProjectStore mutation methods (ADR-0006) — no HTTP layer.
 *
 * Before ADR-0006 this logic lived in routes/folios.ts and could only be
 * exercised through supertest. These tests drive saveFolio / createFolio /
 * deleteFolio directly against a synthetic tmpdir project and assert both the
 * happy paths and the typed domain errors.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile, readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ParsedFolio } from '@axiom-forge/shared';
import { ProjectStore } from './projectStore.js';
import {
	ValidationError,
	NotFoundError,
	BadRequestError,
	InvalidTitleError,
	ConflictError,
} from './storeErrors.js';

const SYNTH_SCHEMA = {
	version: '1.0.0',
	types: {
		Alpha: {
			icon: 'circle',
			folder: 'Alphas',
			sections: {
				Vitals: {
					role: 'meta',
					fields: {
						Label: { type: 'text' },
						Ref: { type: 'wikilink', target: 'Alphas' },
					},
				},
			},
		},
	},
};

const SYNTH_CONFIG = { name: 'Mutations Unit', description: 'fixture', version: '1.0.0' };

function alphaFile(title: string): string {
	return ['---', 'type: Alpha', '---', '', `# ${title}`, '', '## Vitals', '- **Label:** original', ''].join('\n');
}

function folio(name: string, title: string, sections?: ParsedFolio['sections']): ParsedFolio {
	return {
		name,
		title,
		type: 'Alpha',
		folder: 'Alphas',
		tags: [],
		sections: sections ?? { Vitals: { fields: { Label: 'value' } } },
	};
}

const dirs: string[] = [];

async function makeStore(files: string[]): Promise<ProjectStore> {
	const d = await mkdtemp(join(tmpdir(), 'axiom-forge-mut-'));
	await writeFile(join(d, 'config.json'), JSON.stringify(SYNTH_CONFIG), 'utf-8');
	await writeFile(join(d, 'schema.json'), JSON.stringify(SYNTH_SCHEMA), 'utf-8');
	await mkdir(join(d, 'Alphas'), { recursive: true });
	for (const name of files) await writeFile(join(d, 'Alphas', `${name}.md`), alphaFile(name), 'utf-8');
	const store = new ProjectStore(d);
	await store.load();
	dirs.push(d);
	return store;
}

const origLog = console.log;
const origErr = console.error;
beforeEach(() => {
	console.log = () => {};
	console.error = () => {};
});
afterEach(async () => {
	console.log = origLog;
	console.error = origErr;
	await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

// ── createFolio ──────────────────────────────────────────────

describe('ProjectStore.createFolio', () => {
	it('creates a folio, writes it to disk, and indexes it', async () => {
		const store = await makeStore([]);
		const res = await store.createFolio('Alphas', folio('', 'Brand New'));
		expect(res.name).toBe('Brand_New');
		expect(res.warnings).toEqual([]);
		expect(res.brokenLinks).toEqual([]);
		expect(store.getRecord('Alphas', 'Brand_New')).toBeDefined();
		await access(join(store.projectPath, 'Alphas', 'Brand_New.md'));
	});

	it('throws ConflictError when the filename is taken', async () => {
		const store = await makeStore(['Existing']);
		await expect(store.createFolio('Alphas', folio('', 'Existing'))).rejects.toBeInstanceOf(ConflictError);
	});

	it('throws BadRequestError for an unknown folder', async () => {
		const store = await makeStore([]);
		await expect(store.createFolio('Nope', folio('', 'X'))).rejects.toBeInstanceOf(BadRequestError);
	});

	it('throws InvalidTitleError when the title sanitizes to empty', async () => {
		const store = await makeStore([]);
		await expect(store.createFolio('Alphas', folio('', '!!!'))).rejects.toBeInstanceOf(InvalidTitleError);
	});

	it('throws ValidationError on a schema violation', async () => {
		const store = await makeStore([]);
		const bad = folio('', 'Bad', { Unknown: { fields: { X: 'y' } } });
		await expect(store.createFolio('Alphas', bad)).rejects.toBeInstanceOf(ValidationError);
	});
});

// ── saveFolio ────────────────────────────────────────────────

describe('ProjectStore.saveFolio', () => {
	it('saves changed content and advances mtime', async () => {
		const store = await makeStore(['One']);
		const mtime = store.getRecord('Alphas', 'One')!.mtime;
		const res = await store.saveFolio('Alphas', 'One', folio('One', 'One', { Vitals: { fields: { Label: 'changed' } } }), mtime);
		expect(res.renamedTo).toBeUndefined();
		const disk = await readFile(join(store.projectPath, 'Alphas', 'One.md'), 'utf-8');
		expect(disk).toContain('changed');
	});

	it('throws ConflictError (stale) on a mismatched clientMtime', async () => {
		const store = await makeStore(['One']);
		await expect(store.saveFolio('Alphas', 'One', folio('One', 'One'), 1)).rejects.toBeInstanceOf(ConflictError);
	});

	it('throws NotFoundError for an unknown folio', async () => {
		const store = await makeStore([]);
		await expect(store.saveFolio('Alphas', 'Ghost', folio('Ghost', 'Ghost'), 0)).rejects.toBeInstanceOf(NotFoundError);
	});

	it('renames the file and rewrites wikilinks across the project', async () => {
		const store = await makeStore(['Target']);
		// A second folio that links to Target via a wikilink field.
		await store.createFolio('Alphas', folio('', 'Linker', { Vitals: { fields: { Ref: { folder: 'Alphas', name: 'Target' } } } }));

		const mtime = store.getRecord('Alphas', 'Target')!.mtime;
		const res = await store.saveFolio('Alphas', 'Target', folio('Target', 'Target Renamed'), mtime);

		expect(res.renamedTo).toBe('Target_Renamed');
		expect(res.linksRewritten).toBe(1);
		await access(join(store.projectPath, 'Alphas', 'Target_Renamed.md'));
		const linker = await readFile(join(store.projectPath, 'Alphas', 'Linker.md'), 'utf-8');
		expect(linker).toContain('[[Alphas/Target_Renamed]]');
	});
});

// ── deleteFolio ──────────────────────────────────────────────

describe('ProjectStore.deleteFolio', () => {
	it('deletes the file and de-indexes the folio', async () => {
		const store = await makeStore(['Doomed']);
		await store.deleteFolio('Alphas', 'Doomed');
		expect(store.getRecord('Alphas', 'Doomed')).toBeUndefined();
		await expect(access(join(store.projectPath, 'Alphas', 'Doomed.md'))).rejects.toThrow();
	});

	it('throws NotFoundError when the folio does not exist', async () => {
		const store = await makeStore([]);
		await expect(store.deleteFolio('Alphas', 'Nope')).rejects.toBeInstanceOf(NotFoundError);
	});
});
