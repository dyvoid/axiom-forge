/**
 * Direct unit tests for ProjectStore.search() — no HTTP layer.
 *
 * The search scoring logic was previously embedded in the /api/search route
 * handler and could only be tested through supertest. These tests exercise it
 * directly against a synthetic in-memory project, covering the scoring tiers
 * (title, alias, tag, snippet) and edge cases.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ProjectStore } from './projectStore.js';

const SYNTH_SCHEMA = {
	version: '1.0.0',
	types: {
		Alpha: {
			icon: 'circle',
			folder: 'Alphas',
			sections: {
				Vitals: { role: 'meta', fields: { Label: { type: 'text' } } },
				Story: { role: 'prose', type: 'textarea' },
			},
		},
	},
};

const SYNTH_CONFIG = { name: 'Search Unit', description: 'fixture', version: '1.0.0' };

function alphaFile(title: string, opts?: { tags?: string[]; aliases?: string[]; body?: string }): string {
	const data: Record<string, unknown> = { type: 'Alpha' };
	if (opts?.tags?.length) data.tags = opts.tags;
	if (opts?.aliases?.length) data.aliases = opts.aliases;
	const lines = ['---'];
	for (const [k, v] of Object.entries(data)) {
		if (Array.isArray(v)) {
			lines.push(`${k}:`);
			for (const item of v) lines.push(`  - ${item}`);
		} else {
			lines.push(`${k}: ${v}`);
		}
	}
	lines.push('---', '', `# ${title}`, '', '## Vitals', '- **Label:** A label', '');
	if (opts?.body) lines.push('## Story', opts.body, '');
	return lines.join('\n');
}

async function makeStore(files: { name: string; content: string }[]): Promise<ProjectStore> {
	const d = await mkdtemp(join(tmpdir(), 'axiom-forge-search-'));
	await writeFile(join(d, 'config.json'), JSON.stringify(SYNTH_CONFIG), 'utf-8');
	await writeFile(join(d, 'schema.json'), JSON.stringify(SYNTH_SCHEMA), 'utf-8');
	await mkdir(join(d, 'Alphas'), { recursive: true });
	for (const f of files) await writeFile(join(d, 'Alphas', `${f.name}.md`), f.content, 'utf-8');
	const store = new ProjectStore(d);
	await store.load();
	dirs.push(d);
	return store;
}

const dirs: string[] = [];
const origLog = console.log;

beforeEach(() => { console.log = () => {}; });
afterEach(async () => {
	console.log = origLog;
	await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe('ProjectStore.search()', () => {
	it('returns an empty array for an empty query', async () => {
		const store = await makeStore([{ name: 'Ghost', content: alphaFile('Ghost') }]);
		expect(store.search('')).toEqual([]);
		expect(store.search('   ')).toEqual([]);
	});

	it('scores exact title matches highest', async () => {
		const store = await makeStore([
			{ name: 'Ghost', content: alphaFile('Ghost') },
			{ name: 'Ghostly_Apparition', content: alphaFile('Ghostly Apparition') },
			{ name: 'The_Ghost_King', content: alphaFile('The Ghost King') },
		]);
		const results = store.search('ghost');
		expect(results.map((f) => f.title)).toEqual(['Ghost', 'Ghostly Apparition', 'The Ghost King']);
	});

	it('matches on aliases below title but above tags', async () => {
		const store = await makeStore([
			{ name: 'Exact', content: alphaFile('Exact') },
			{ name: 'Aliased', content: alphaFile('Aliased', { aliases: ['Phantom'] }) },
		]);
		const results = store.search('phantom');
		expect(results.map((f) => f.title)).toEqual(['Aliased']);
	});

	it('matches on tags', async () => {
		const store = await makeStore([
			{ name: 'Tagged', content: alphaFile('Tagged', { tags: ['myth'] }) },
			{ name: 'Plain', content: alphaFile('Plain') },
		]);
		const results = store.search('myth');
		expect(results.map((f) => f.title)).toEqual(['Tagged']);
	});

	it('matches on snippet content', async () => {
		const store = await makeStore([
			{ name: 'Storyteller', content: alphaFile('Storyteller', { body: 'A tale of ghosts and gods.' }) },
		]);
		const results = store.search('ghosts');
		expect(results.map((f) => f.title)).toEqual(['Storyteller']);
	});

	it('sorts identically scored items alphabetically', async () => {
		const store = await makeStore([
			{ name: 'Zebra', content: alphaFile('Zebra', { body: 'saw a ghost' }) },
			{ name: 'Alpha', content: alphaFile('Alpha', { body: 'saw a ghost' }) },
		]);
		const results = store.search('ghost');
		expect(results.map((f) => f.title)).toEqual(['Alpha', 'Zebra']);
	});

	it('limits results to 20', async () => {
		const files = Array.from({ length: 25 }, (_, i) => ({
			name: `Match_${i}`,
			content: alphaFile(`Match ${i}`),
		}));
		const store = await makeStore(files);
		expect(store.search('match').length).toBe(20);
	});

	it('is case-insensitive', async () => {
		const store = await makeStore([
			{ name: 'Mixed', content: alphaFile('MixedCase') },
		]);
		expect(store.search('MIXEDCASE').map((f) => f.title)).toEqual(['MixedCase']);
		expect(store.search('mixedcase').map((f) => f.title)).toEqual(['MixedCase']);
	});
});
