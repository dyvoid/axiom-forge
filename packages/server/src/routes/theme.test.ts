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

const SYNTH_CONFIG = { name: 'Theme Test Project' };

async function createFixture(theme?: string): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), 'axiom-forge-test-'));
	await writeFile(join(dir, 'config.json'), JSON.stringify(SYNTH_CONFIG), 'utf-8');
	await writeFile(join(dir, 'schema.json'), JSON.stringify(SYNTH_SCHEMA), 'utf-8');
	if (theme !== undefined) await writeFile(join(dir, 'theme.json'), theme, 'utf-8');
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

async function themeWarnings(app: express.Express): Promise<string[] | undefined> {
	const res = await request(app).get('/api/warnings');
	const entry = (res.body as { folder: string; name: string; warnings: string[] }[])
		.find((e) => e.folder === '' && e.name === 'theme.json');
	return entry?.warnings;
}

// ── Lifecycle ────────────────────────────────────────────────

let tmpDir: string | undefined;

const origLog = console.log;
beforeEach(() => {
	console.log = () => {};
});
afterEach(async () => {
	console.log = origLog;
	if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
	tmpDir = undefined;
});

// ── GET /api/theme ───────────────────────────────────────────

describe('GET /api/theme', () => {
	it('returns an empty theme and no warning when the project has no theme.json', async () => {
		tmpDir = await createFixture();
		const app = await makeApp(tmpDir);

		const res = await request(app).get('/api/theme');
		expect(res.status).toBe(200);
		expect(res.body).toEqual({});
		expect(await themeWarnings(app)).toBeUndefined();
	});

	it('returns a valid theme as written', async () => {
		const theme = { hero: { enabled: false, smoke: '#ffffff', size: 1.5, vignette: { strength: 0.2 } } };
		tmpDir = await createFixture(JSON.stringify(theme));
		const app = await makeApp(tmpDir);

		const res = await request(app).get('/api/theme');
		expect(res.body).toEqual(theme);
		expect(await themeWarnings(app)).toBeUndefined();
	});

	it('keeps the valid values of a partly invalid theme and reports the rest', async () => {
		tmpDir = await createFixture(JSON.stringify({ hero: { speed: 2, density: 7 } }));
		const app = await makeApp(tmpDir);

		const res = await request(app).get('/api/theme');
		expect(res.body).toEqual({ hero: { speed: 2 } });
		const warnings = await themeWarnings(app);
		expect(warnings).toHaveLength(1);
		expect(warnings?.[0]).toContain('"hero.density"');
	});

	it('still loads the project when theme.json is not valid JSON', async () => {
		tmpDir = await createFixture('{ "hero": ');
		const app = await makeApp(tmpDir);

		expect((await request(app).get('/api/config')).body).toEqual(SYNTH_CONFIG);
		expect((await request(app).get('/api/theme')).body).toEqual({});
		const warnings = await themeWarnings(app);
		expect(warnings).toHaveLength(1);
		expect(warnings?.[0]).toMatch(/^Invalid JSON/);
	});

	it('picks up a theme.json added or removed before a reload', async () => {
		tmpDir = await createFixture();
		const app = await makeApp(tmpDir);

		await writeFile(join(tmpDir, 'theme.json'), JSON.stringify({ hero: { clearTitle: true } }), 'utf-8');
		await request(app).post('/api/reload');
		expect((await request(app).get('/api/theme')).body).toEqual({ hero: { clearTitle: true } });

		await rm(join(tmpDir, 'theme.json'));
		await request(app).post('/api/reload');
		expect((await request(app).get('/api/theme')).body).toEqual({});
	});
});
