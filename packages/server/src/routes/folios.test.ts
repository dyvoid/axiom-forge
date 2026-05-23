/**
 * Folio route integration tests.
 *
 * Each test builds a fresh project directory in os.tmpdir() containing a
 * **synthetic** schema.json and a handful of .md files crafted for the case
 * under test. The engine is schema-agnostic by design — no test references
 * any specific real-world type name (Character, Human, etc.).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { mkdtemp, mkdir, rm, writeFile, readFile, stat, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ProjectStore } from '../projectStore.js';
import { mountRoutes } from './index.js';

// ── Synthetic project fixture ────────────────────────────────

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
						Mood:  { type: 'select', options: ['Calm', 'Restless'] },
						Pal:   { type: 'wikilink', target: 'Betas' },
					},
				},
				Story: { role: 'prose', type: 'textarea' },
			},
		},
		Beta: {
			icon: 'square',
			folder: 'Betas',
			sections: {
				Vitals: {
					role: 'meta',
					fields: { Label: { type: 'text' } },
				},
			},
		},
	},
};

const SYNTH_CONFIG = {
	name: 'Test Project',
	description: 'Synthetic fixture for route tests',
	version: '1.0.0',
};

function alphaFile(title: string, pal?: string, body?: string): string {
	const lines = [
		`# ${title}`,
		'',
		'## Meta',
		'- **Type:** Alpha',
		'- **Tags:** sample',
		'',
		'## Vitals',
		'- **Label:** A label',
	];
	if (pal) lines.push(`- **Pal:** [[Betas/${pal}]]`);
	lines.push('');
	if (body) {
		lines.push('## Story');
		lines.push(body);
		lines.push('');
	}
	return lines.join('\n');
}

function betaFile(title: string): string {
	return [
		`# ${title}`,
		'',
		'## Meta',
		'- **Type:** Beta',
		'- **Tags:**',
		'',
		'## Vitals',
		'- **Label:** A beta',
		'',
	].join('\n');
}

async function createFixture(): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), 'axiom-forge-test-'));
	await writeFile(join(dir, 'config.json'), JSON.stringify(SYNTH_CONFIG), 'utf-8');
	await writeFile(join(dir, 'schema.json'), JSON.stringify(SYNTH_SCHEMA), 'utf-8');
	await mkdir(join(dir, 'Alphas'), { recursive: true });
	await mkdir(join(dir, 'Betas'), { recursive: true });
	await writeFile(join(dir, 'Alphas', 'One.md'),   alphaFile('One', 'Aleph', 'One has a story.'), 'utf-8');
	await writeFile(join(dir, 'Alphas', 'Two.md'),   alphaFile('Two', 'Aleph', 'Two refers to Aleph.'), 'utf-8');
	await writeFile(join(dir, 'Alphas', 'Three.md'), alphaFile('Three'), 'utf-8');
	await writeFile(join(dir, 'Betas',  'Aleph.md'), betaFile('Aleph'), 'utf-8');
	await writeFile(join(dir, 'Betas',  'Bet.md'),   betaFile('Bet'), 'utf-8');
	return dir;
}

async function makeApp(dir: string): Promise<express.Express> {
	const store = new ProjectStore(dir);
	await store.load();
	const app = express();
	app.use(express.json());
	mountRoutes(app, store);
	return app;
}

// ── Lifecycle ────────────────────────────────────────────────

let tmpDir: string;
let app: express.Express;

// Suppress the projectStore "loaded N folios" console noise during tests.
const origLog = console.log;
beforeEach(async () => {
	console.log = () => {};
	tmpDir = await createFixture();
	app = await makeApp(tmpDir);
});
afterEach(async () => {
	console.log = origLog;
	await rm(tmpDir, { recursive: true, force: true });
});

// ── GET ──────────────────────────────────────────────────────

describe('GET /api/folios', () => {
	it('returns all index records in alphabetical order', async () => {
		const res = await request(app).get('/api/folios');
		expect(res.status).toBe(200);
		expect(res.body.map((f: { name: string }) => f.name)).toEqual([
			'Aleph', 'Bet', 'One', 'Three', 'Two',
		]);
	});
});

describe('GET /api/folios/:folder/:name', () => {
	it('returns the parsed folio with id and mtime', async () => {
		const res = await request(app).get('/api/folios/Alphas/One');
		expect(res.status).toBe(200);
		expect(res.body.title).toBe('One');
		expect(res.body.type).toBe('Alpha');
		expect(typeof res.body.id).toBe('number');
		expect(typeof res.body.mtime).toBe('number');
		expect(res.body.sections.Vitals.fields.Pal).toEqual({ folder: 'Betas', name: 'Aleph' });
	});

	it('404s for an unknown folio', async () => {
		const res = await request(app).get('/api/folios/Alphas/Nope');
		expect(res.status).toBe(404);
	});
});

// ── PUT — in-place save ──────────────────────────────────────

describe('PUT /api/folios/:folder/:name — in-place', () => {
	async function readFolio(folder: string, name: string) {
		const res = await request(app).get(`/api/folios/${folder}/${name}`);
		return res.body;
	}

	it('saves a changed textarea section and advances mtime', async () => {
		const folio = await readFolio('Alphas', 'One');
		folio.sections.Story = { content: 'A revised story.' };

		const res = await request(app)
			.put('/api/folios/Alphas/One')
			.send({ folio, clientMtime: folio.mtime });

		expect(res.status).toBe(200);
		expect(res.body.mtime).toBeGreaterThanOrEqual(folio.mtime);
		expect(res.body.brokenLinks).toEqual([]);
		const disk = await readFile(join(tmpDir, 'Alphas', 'One.md'), 'utf-8');
		expect(disk).toContain('A revised story.');
	});

	it('returns 409 on stale clientMtime', async () => {
		const folio = await readFolio('Alphas', 'One');
		const res = await request(app)
			.put('/api/folios/Alphas/One')
			.send({ folio, clientMtime: folio.mtime - 100000 });
		expect(res.status).toBe(409);
		expect(res.body).toHaveProperty('serverMtime');
	});

	it('returns 400 invalid-shape when tags is not an array', async () => {
		const folio = await readFolio('Alphas', 'One');
		const bad = { ...folio, tags: 'not-an-array' };
		const res = await request(app)
			.put('/api/folios/Alphas/One')
			.send({ folio: bad, clientMtime: folio.mtime });
		expect(res.status).toBe(400);
		expect(res.body.error).toBe('invalid-shape');
	});

	it('returns 400 schema-violation for an unknown section', async () => {
		const folio = await readFolio('Alphas', 'One');
		folio.sections.Nonexistent = { content: 'x' };
		const res = await request(app)
			.put('/api/folios/Alphas/One')
			.send({ folio, clientMtime: folio.mtime });
		expect(res.status).toBe(400);
		expect(res.body.error).toBe('schema-violation');
		expect(res.body.issues).toEqual(
			expect.arrayContaining([expect.objectContaining({ code: 'unknown-section' })]),
		);
	});

	it('returns 400 schema-violation for an invalid select value', async () => {
		const folio = await readFolio('Alphas', 'One');
		folio.sections.Vitals.fields.Mood = 'Joyful';
		const res = await request(app)
			.put('/api/folios/Alphas/One')
			.send({ folio, clientMtime: folio.mtime });
		expect(res.status).toBe(400);
		expect(res.body.error).toBe('schema-violation');
		expect(res.body.issues).toEqual(
			expect.arrayContaining([expect.objectContaining({ code: 'invalid-select-value' })]),
		);
	});

	it('reports brokenLinks when a wikilink points to a missing folio', async () => {
		const folio = await readFolio('Alphas', 'One');
		folio.sections.Vitals.fields.Pal = { folder: 'Betas', name: 'Ghost' };
		const res = await request(app)
			.put('/api/folios/Alphas/One')
			.send({ folio, clientMtime: folio.mtime });
		expect(res.status).toBe(200);
		expect(res.body.brokenLinks).toEqual([
			expect.objectContaining({ folder: 'Betas', name: 'Ghost', section: 'Vitals', field: 'Pal' }),
		]);
	});
});

// ── PUT — rename pipeline ───────────────────────────────────

describe('PUT /api/folios/:folder/:name — rename', () => {
	it('renames the file and rewrites every wikilink across the project', async () => {
		const res0 = await request(app).get('/api/folios/Betas/Aleph');
		const folio = res0.body;
		folio.title = 'Aleph_Renamed';

		const res = await request(app)
			.put('/api/folios/Betas/Aleph')
			.send({ folio, clientMtime: folio.mtime });

		expect(res.status).toBe(200);
		expect(res.body.renamedTo).toBe('Aleph_Renamed');
		expect(res.body.linksRewritten).toBeGreaterThanOrEqual(2);

		// Old file gone, new file present
		await expect(access(join(tmpDir, 'Betas', 'Aleph.md'))).rejects.toThrow();
		const renamed = await readFile(join(tmpDir, 'Betas', 'Aleph_Renamed.md'), 'utf-8');
		expect(renamed).toContain('# Aleph_Renamed');

		// Other files rewritten
		const one = await readFile(join(tmpDir, 'Alphas', 'One.md'), 'utf-8');
		expect(one).toContain('[[Betas/Aleph_Renamed]]');
		expect(one).not.toContain('[[Betas/Aleph]]');
		const two = await readFile(join(tmpDir, 'Alphas', 'Two.md'), 'utf-8');
		expect(two).toContain('[[Betas/Aleph_Renamed]]');

		// Index updated; old name no longer accessible
		const stale = await request(app).get('/api/folios/Betas/Aleph');
		expect(stale.status).toBe(404);
		const fresh = await request(app).get('/api/folios/Betas/Aleph_Renamed');
		expect(fresh.status).toBe(200);
	});

	it('preserves the folio id across a rename', async () => {
		const before = await request(app).get('/api/folios');
		const alephId = (before.body as { name: string; id: number }[]).find((f) => f.name === 'Aleph')?.id;

		const res0 = await request(app).get('/api/folios/Betas/Aleph');
		res0.body.title = 'Aleph_Renamed';
		await request(app)
			.put('/api/folios/Betas/Aleph')
			.send({ folio: res0.body, clientMtime: res0.body.mtime });

		const after = await request(app).get('/api/folios');
		const renamedId = (after.body as { name: string; id: number }[])
			.find((f) => f.name === 'Aleph_Renamed')?.id;
		expect(renamedId).toBe(alephId);
	});

	it('returns 409 exists when the target filename is taken', async () => {
		const res0 = await request(app).get('/api/folios/Betas/Aleph');
		res0.body.title = 'Bet';   // collision

		const res = await request(app)
			.put('/api/folios/Betas/Aleph')
			.send({ folio: res0.body, clientMtime: res0.body.mtime });

		expect(res.status).toBe(409);
		expect(res.body.error).toBe('exists');

		// Original file should still be intact.
		await access(join(tmpDir, 'Betas', 'Aleph.md'));
	});

	it('returns 400 when the title sanitizes to an empty filename', async () => {
		const res0 = await request(app).get('/api/folios/Betas/Aleph');
		res0.body.title = '/'; // produces empty filename after sanitize

		const res = await request(app)
			.put('/api/folios/Betas/Aleph')
			.send({ folio: res0.body, clientMtime: res0.body.mtime });

		expect(res.status).toBe(400);
		expect(res.body.error).toBe('invalid-title');
	});
});

// ── POST + DELETE round-trip ────────────────────────────────

describe('POST + DELETE /api/folios/:folder', () => {
	it('creates a new folio and then deletes it', async () => {
		const newFolio = {
			name: '',
			title: 'Brand_New',
			type: 'Alpha',
			folder: 'Alphas',
			tags: ['fresh'],
			sections: { Vitals: { fields: { Label: 'Hello' } } },
		};

		const createRes = await request(app)
			.post('/api/folios/Alphas')
			.send({ folio: newFolio });

		expect(createRes.status).toBe(201);
		expect(createRes.body.name).toBe('Brand_New');
		expect(createRes.body.brokenLinks).toEqual([]);
		await access(join(tmpDir, 'Alphas', 'Brand_New.md'));

		const list = await request(app).get('/api/folios');
		expect((list.body as { name: string }[]).map((f) => f.name)).toContain('Brand_New');

		const delRes = await request(app).delete('/api/folios/Alphas/Brand_New');
		expect(delRes.status).toBe(200);
		await expect(access(join(tmpDir, 'Alphas', 'Brand_New.md'))).rejects.toThrow();

		const after = await request(app).get('/api/folios/Alphas/Brand_New');
		expect(after.status).toBe(404);
	});

	it('rejects POST when title produces an empty filename', async () => {
		const res = await request(app)
			.post('/api/folios/Alphas')
			.send({ folio: {
				name: '', title: '/', type: 'Alpha', folder: 'Alphas',
				tags: [], sections: {},
			} });
		expect(res.status).toBe(400);
		expect(res.body.error).toBe('invalid-title');
	});

	it('rejects POST with 409 when filename collides', async () => {
		const res = await request(app)
			.post('/api/folios/Alphas')
			.send({ folio: {
				name: '', title: 'One', type: 'Alpha', folder: 'Alphas',
				tags: [], sections: { Vitals: { fields: { Label: 'x' } } },
			} });
		expect(res.status).toBe(409);
	});
	it('reports brokenLinks when a wikilink points to a missing folio on creation', async () => {
		const newFolio = {
			name: '',
			title: 'Brand_New',
			type: 'Alpha',
			folder: 'Alphas',
			tags: ['fresh'],
			sections: { Vitals: { fields: { Label: 'Hello', Pal: { folder: 'Betas', name: 'Ghost' } } } },
		};

		const createRes = await request(app)
			.post('/api/folios/Alphas')
			.send({ folio: newFolio });

		expect(createRes.status).toBe(201);
		expect(createRes.body.brokenLinks).toEqual([
			expect.objectContaining({ folder: 'Betas', name: 'Ghost', section: 'Vitals', field: 'Pal' }),
		]);
	});
});

// ── GET backlinks ───────────────────────────────────────────

describe('GET /api/folios/:folder/:name/backlinks', () => {
	it('returns folios that link to the target', async () => {
		// Aleph is linked by One and Two
		const res = await request(app).get('/api/folios/Betas/Aleph/backlinks');
		expect(res.status).toBe(200);
		const linkingNames = (res.body as { name: string }[]).map(f => f.name).sort();
		expect(linkingNames).toEqual(['One', 'Two']);
	});

	it('returns an empty array if nothing links to the target', async () => {
		const res = await request(app).get('/api/folios/Betas/Bet/backlinks');
		expect(res.status).toBe(200);
		expect(res.body).toEqual([]);
	});
});

// touch unused imports so they don't get tree-shaken away by accident
void stat;
