import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
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
					},
				},
				Story: { role: 'prose', type: 'textarea' },
			},
		},
	},
};

const SYNTH_CONFIG = {
	name: 'Test Search Project',
	description: 'Fixture for search',
	version: '1.0.0',
};

function alphaFile(title: string, body?: string): string {
	const lines = [
		'---',
		'type: Alpha',
		'tags:',
		'  - sample',
		'---',
		'',
		`# ${title}`,
		'',
		'## Vitals',
		'- **Label:** A label',
		'',
	];
	if (body) {
		lines.push('## Story');
		lines.push(body);
		lines.push('');
	}
	return lines.join('\n');
}

async function createFixture(): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), 'axiom-forge-test-'));
	await writeFile(join(dir, 'config.json'), JSON.stringify(SYNTH_CONFIG), 'utf-8');
	await writeFile(join(dir, 'schema.json'), JSON.stringify(SYNTH_SCHEMA), 'utf-8');
	await mkdir(join(dir, 'Alphas'), { recursive: true });
	
	// Exact match target
	await writeFile(join(dir, 'Alphas', 'Ghost.md'), alphaFile('Ghost', 'A silent specter.'), 'utf-8');
	// Prefix match
	await writeFile(join(dir, 'Alphas', 'Ghostly_Apparition.md'), alphaFile('Ghostly Apparition'), 'utf-8');
	// Substring match
	await writeFile(join(dir, 'Alphas', 'The_Ghost_King.md'), alphaFile('The Ghost King'), 'utf-8');
	// Snippet/prose match
	await writeFile(join(dir, 'Alphas', 'Random.md'), alphaFile('Random', 'This guy saw a ghost once.'), 'utf-8');
	
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

// ── POST /api/reload ─────────────────────────────────────────

describe('POST /api/reload', () => {
	it('returns { ok: true }', async () => {
		const res = await request(app).post('/api/reload');
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ ok: true });
	});

	it('keeps folios accessible after reload', async () => {
		await request(app).post('/api/reload');
		const res = await request(app).get('/api/folios/Alphas/Ghost');
		expect(res.status).toBe(200);
		expect(res.body.title).toBe('Ghost');
	});
});

// ── GET /api/search ──────────────────────────────────────────

describe('GET /api/search', () => {
	it('returns an empty array if query is empty', async () => {
		const res = await request(app).get('/api/search?q=');
		expect(res.status).toBe(200);
		expect(res.body).toEqual([]);
	});

	it('returns an empty array if query is just whitespace', async () => {
		const res = await request(app).get('/api/search?q=%20%20');
		expect(res.status).toBe(200);
		expect(res.body).toEqual([]);
	});

	it('scores exact title matches highest', async () => {
		const res = await request(app).get('/api/search?q=ghost');
		expect(res.status).toBe(200);
		expect(res.body.length).toBe(4);
		
		// "Ghost" -> exact match
		expect(res.body[0].title).toBe('Ghost');
		// "Ghostly Apparition" -> prefix match
		expect(res.body[1].title).toBe('Ghostly Apparition');
		// "The Ghost King" -> substring match
		expect(res.body[2].title).toBe('The Ghost King');
		// "Random" -> snippet match only
		expect(res.body[3].title).toBe('Random');
	});
	
	it('matches on a folio alias even when the title differs', async () => {
		const aliased = [
			'---',
			'type: Alpha',
			'aliases:',
			'  - Phantom',
			'---',
			'',
			'# Wraith',
			'',
			'## Vitals',
			'- **Label:** A label',
			'',
		].join('\n');
		await writeFile(join(tmpDir, 'Alphas', 'Wraith.md'), aliased, 'utf-8');
		app = await makeApp(tmpDir);

		const res = await request(app).get('/api/search?q=phantom');
		expect(res.status).toBe(200);
		expect(res.body.map((f: { title: string }) => f.title)).toContain('Wraith');

		// An alias hit must resolve to the aliased folio itself, and carry its
		// aliases, so result cards can both navigate to it and show why it matched.
		const hit = res.body.find((f: { title: string }) => f.title === 'Wraith');
		expect(hit.folder).toBe('Alphas');
		expect(hit.name).toBe('Wraith');
		expect(hit.aliases).toEqual(['Phantom']);
	});

	it('sorts identically scored items alphabetically', async () => {
		// Create another exact snippet match to verify alphabetical fallback
		await writeFile(join(tmpDir, 'Alphas', 'Another.md'), alphaFile('Another', 'He also saw a ghost.'), 'utf-8');
		// Reload the app to pick up the new file
		app = await makeApp(tmpDir);
		
		const res = await request(app).get('/api/search?q=ghost');
		expect(res.status).toBe(200);
		expect(res.body.length).toBe(5);
		
		// Snippet matches score 1. Alphabetical: "Another" before "Random"
		expect(res.body[3].title).toBe('Another');
		expect(res.body[4].title).toBe('Random');
	});
});
