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
					fields: { Label: { type: 'text' } },
				},
				Story: { role: 'prose', type: 'textarea' },
			},
		},
	},
};

const SYNTH_CONFIG = {
	name: 'Schema Test Project',
	description: 'Fixture for schema route',
	version: '1.0.0',
};

async function createFixture(): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), 'axiom-forge-test-'));
	await writeFile(join(dir, 'config.json'), JSON.stringify(SYNTH_CONFIG), 'utf-8');
	await writeFile(join(dir, 'schema.json'), JSON.stringify(SYNTH_SCHEMA), 'utf-8');
	await mkdir(join(dir, 'Alphas'), { recursive: true });
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

// ── GET /api/schema ──────────────────────────────────────────

describe('GET /api/schema', () => {
	it('returns the validated schema with its type definitions', async () => {
		const res = await request(app).get('/api/schema');
		expect(res.status).toBe(200);
		expect(res.body.version).toBe('1.0.0');
		expect(res.body.types.Alpha.folder).toBe('Alphas');
		expect(res.body.types.Alpha.sections.Vitals.fields.Label.type).toBe('text');
	});

	it('reflects an edited schema after reload', async () => {
		const updated = {
			...SYNTH_SCHEMA,
			types: {
				...SYNTH_SCHEMA.types,
				Beta: {
					icon: 'square',
					folder: 'Betas',
					sections: { Vitals: { role: 'meta', fields: { Label: { type: 'text' } } } },
				},
			},
		};
		await writeFile(join(tmpDir, 'schema.json'), JSON.stringify(updated), 'utf-8');
		await request(app).post('/api/reload');

		const res = await request(app).get('/api/schema');
		expect(res.status).toBe(200);
		expect(Object.keys(res.body.types)).toContain('Beta');
	});
});
