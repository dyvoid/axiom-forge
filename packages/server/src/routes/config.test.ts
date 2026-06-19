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
				Vitals: { role: 'meta', fields: { Label: { type: 'text' } } },
			},
		},
	},
};

const SYNTH_CONFIG = {
	name: 'Config Test Project',
	description: 'Fixture for config route',
	version: '2.3.4',
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

// ── GET /api/config ──────────────────────────────────────────

describe('GET /api/config', () => {
	it('returns the project config from disk', async () => {
		const res = await request(app).get('/api/config');
		expect(res.status).toBe(200);
		expect(res.body).toEqual(SYNTH_CONFIG);
	});

	it('reflects an edited config after reload', async () => {
		const updated = { ...SYNTH_CONFIG, name: 'Renamed Project' };
		await writeFile(join(tmpDir, 'config.json'), JSON.stringify(updated), 'utf-8');
		await request(app).post('/api/reload');

		const res = await request(app).get('/api/config');
		expect(res.status).toBe(200);
		expect(res.body.name).toBe('Renamed Project');
	});
});
