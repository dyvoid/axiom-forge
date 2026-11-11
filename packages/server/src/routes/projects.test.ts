import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Express } from 'express';
import { createApp } from '../app.js';
import { ProjectRegistry, type ProjectLibrary } from '../projectRegistry.js';

// ── Synthetic projects ───────────────────────────────────────

const SCHEMA = {
	version: '1.0.0',
	types: {
		Alpha: {
			icon: 'circle',
			folder: 'Alphas',
			sections: { Story: { role: 'prose', type: 'textarea' } },
		},
	},
};

const HOST = '127.0.0.1:3000';

let root: string;
let registryPath: string;
let registry: ProjectRegistry;
let app: Express;

/** Write a loadable project named `name` under the temp root and return its path. */
async function makeProject(dir: string, name: string, folios: string[] = []): Promise<string> {
	const path = join(root, dir);
	await mkdir(join(path, 'Alphas'), { recursive: true });
	await writeFile(join(path, 'config.json'), JSON.stringify({ name, publisher: 'kept' }));
	await writeFile(join(path, 'schema.json'), JSON.stringify(SCHEMA));
	for (const title of folios) {
		await writeFile(join(path, 'Alphas', `${title}.md`), `---\ntitle: ${title}\ntype: Alpha\n---\n\n## Story\n${title} lives in ${name}.\n`);
	}
	return path;
}

const api = () => request(app);
const add = (path: string, create?: object) =>
	api().post('/api/projects').set('Host', HOST).send(create ? { path, create } : { path });
const idOf = (library: ProjectLibrary, name: string): string => library.projects.find((p) => p.name === name)!.id;

beforeEach(async () => {
	vi.spyOn(console, 'log').mockImplementation(() => {});
	root = await mkdtemp(join(tmpdir(), 'axiom-registry-'));
	registryPath = join(root, 'home', 'projects.json');
	registry = new ProjectRegistry(registryPath);
	await registry.init();
	app = createApp(registry);
});

afterEach(async () => {
	vi.restoreAllMocks();
	await rm(root, { recursive: true, force: true });
});

describe('with no project open', () => {
	it('lists nothing and refuses the folio endpoints', async () => {
		const list = await api().get('/api/projects').set('Host', HOST).expect(200);
		expect(list.body).toEqual({ activeId: null, projects: [] });

		const folios = await api().get('/api/folios').set('Host', HOST).expect(409);
		expect(folios.body).toEqual({ error: 'no-project' });
	});
});

describe('POST /api/projects', () => {
	it('adds an existing project, opens it, and serves its folios', async () => {
		const path = await makeProject('one', 'One', ['Ada']);
		const res = await add(path).expect(201);

		expect(res.body.projects).toHaveLength(1);
		expect(res.body.projects[0]).toMatchObject({ name: 'One', available: true });
		expect(res.body.activeId).toBe(res.body.projects[0].id);

		const folios = await api().get('/api/folios').set('Host', HOST).expect(200);
		expect(folios.body.map((f: { name: string }) => f.name)).toEqual(['Ada']);
	});

	it('is idempotent: the same folder is one project', async () => {
		const path = await makeProject('one', 'One');
		await add(path).expect(201);
		const again = await add(`${path}/`).expect(201);
		expect(again.body.projects).toHaveLength(1);
	});

	it('rejects a relative path', async () => {
		const res = await add('worlds/one').expect(400);
		expect(res.body.error).toMatch(/full path/);
	});

	it('says a folder is not a project, and whether one could be started there', async () => {
		const empty = join(root, 'empty');
		await mkdir(empty);
		expect((await add(empty).expect(404)).body).toMatchObject({ error: 'not-a-project', canCreate: true });
		expect((await add(join(root, 'not-yet-made')).expect(404)).body).toMatchObject({ canCreate: true });

		// Half a project: creating here would overwrite the file that exists.
		const half = join(root, 'half');
		await mkdir(half);
		await writeFile(join(half, 'schema.json'), JSON.stringify(SCHEMA));
		expect((await add(half).expect(404)).body).toMatchObject({ error: 'not-a-project', canCreate: false });
	});

	it('does not list a project that will not load, and keeps the open one open', async () => {
		const good = await makeProject('good', 'Good');
		const opened = await add(good).expect(201);

		const bad = await makeProject('bad', 'Bad');
		await writeFile(join(bad, 'schema.json'), '{ "version": "1", "types": { "X": {} } }');
		const res = await add(bad).expect(422);
		expect(res.body.error).toBe('invalid-project');
		expect(res.body.reason).toMatch(/schema\.json/);

		const list = await api().get('/api/projects').set('Host', HOST);
		expect(list.body.projects.map((p: { name: string }) => p.name)).toEqual(['Good']);
		expect(list.body.activeId).toBe(opened.body.activeId);
	});

	it('starts a new project in an empty folder, ready to take a folio', async () => {
		const path = join(root, 'fresh', 'world');
		const res = await add(path, { name: 'Fresh World', description: 'Just begun' }).expect(201);
		expect(res.body.projects[0]).toMatchObject({ name: 'Fresh World', description: 'Just begun', available: true });

		expect(JSON.parse(await readFile(join(path, 'config.json'), 'utf-8'))).toEqual({
			name: 'Fresh World',
			description: 'Just begun',
		});
		const schema = (await api().get('/api/schema').set('Host', HOST).expect(200)).body;
		const [typeKey, typeDef] = Object.entries(schema.types)[0] as [string, { folder: string }];

		await api().post(`/api/folios/${typeDef.folder}`).set('Host', HOST)
			.send({ folio: { name: '', title: 'First', type: typeKey, folder: typeDef.folder, tags: [], sections: {} } })
			.expect(201);
		expect((await stat(join(path, typeDef.folder, 'First.md'))).isFile()).toBe(true);
	});

	it('refuses to start a project over existing project files', async () => {
		const path = await makeProject('one', 'One');
		const res = await add(path, { name: 'Overwrite' }).expect(400);
		expect(res.body.error).toMatch(/already holds project files/);
		expect(JSON.parse(await readFile(join(path, 'config.json'), 'utf-8')).name).toBe('One');
	});

	it('refuses to start a project without a name', async () => {
		await add(join(root, 'nameless'), { name: '   ' }).expect(400);
		await expect(stat(join(root, 'nameless'))).rejects.toThrow();
	});
});

describe('POST /api/projects/:id/activate', () => {
	it('switches which project the folio endpoints serve', async () => {
		await add(await makeProject('one', 'One', ['Ada'])).expect(201);
		const library = (await add(await makeProject('two', 'Two', ['Bea'])).expect(201)).body as ProjectLibrary;
		expect((await api().get('/api/config').set('Host', HOST)).body.name).toBe('Two');

		const switched = await api().post(`/api/projects/${idOf(library, 'One')}/activate`).set('Host', HOST).expect(200);
		expect(switched.body.activeId).toBe(idOf(library, 'One'));
		expect((await api().get('/api/config').set('Host', HOST)).body.name).toBe('One');
		expect((await api().get('/api/folios').set('Host', HOST)).body[0].name).toBe('Ada');
	});

	it('keeps the open project when the target has stopped loading', async () => {
		const one = await makeProject('one', 'One');
		await add(one).expect(201);
		const library = (await add(await makeProject('two', 'Two')).expect(201)).body as ProjectLibrary;

		await writeFile(join(one, 'schema.json'), 'not json');
		await api().post(`/api/projects/${idOf(library, 'One')}/activate`).set('Host', HOST).expect(422);
		expect((await api().get('/api/config').set('Host', HOST)).body.name).toBe('Two');
	});

	it('answers 404 for an id that is not listed', async () => {
		await api().post('/api/projects/nope/activate').set('Host', HOST).expect(404);
	});
});

describe('the X-Axiom-Project guard', () => {
	it('refuses a request made for a project that is no longer the open one', async () => {
		const first = (await add(await makeProject('one', 'One', ['Ada'])).expect(201)).body as ProjectLibrary;
		const second = (await add(await makeProject('two', 'Two')).expect(201)).body as ProjectLibrary;

		// A tab still showing "One" tries to delete a folio after another tab opened "Two".
		const stale = await api().delete('/api/folios/Alphas/Ada').set('Host', HOST)
			.set('X-Axiom-Project', first.activeId!).expect(409);
		expect(stale.body).toEqual({ error: 'project-changed', activeId: second.activeId });

		await api().get('/api/folios').set('Host', HOST).set('X-Axiom-Project', second.activeId!).expect(200);
		// No header at all is allowed: an <img> cannot send one.
		await api().get('/api/folios').set('Host', HOST).expect(200);
	});
});

describe('PATCH /api/projects/:id', () => {
	it('rewrites config.json, keeps unmanaged keys, and updates the open project', async () => {
		const path = await makeProject('one', 'One');
		const library = (await add(path).expect(201)).body as ProjectLibrary;

		const res = await api().patch(`/api/projects/${library.activeId}`).set('Host', HOST)
			.send({ name: 'Renamed', description: 'Now described', version: '' }).expect(200);
		expect(res.body.projects[0]).toMatchObject({ name: 'Renamed', description: 'Now described' });

		expect(JSON.parse(await readFile(join(path, 'config.json'), 'utf-8'))).toEqual({
			name: 'Renamed',
			publisher: 'kept',
			description: 'Now described',
		});
		expect((await api().get('/api/config').set('Host', HOST)).body.name).toBe('Renamed');
	});

	it('edits a project that is not the open one', async () => {
		const one = await makeProject('one', 'One');
		const first = (await add(one).expect(201)).body as ProjectLibrary;
		await add(await makeProject('two', 'Two')).expect(201);

		await api().patch(`/api/projects/${first.activeId}`).set('Host', HOST).send({ name: 'Uno' }).expect(200);
		expect(JSON.parse(await readFile(join(one, 'config.json'), 'utf-8')).name).toBe('Uno');
		expect((await api().get('/api/config').set('Host', HOST)).body.name).toBe('Two');
	});

	it('rejects an empty name and leaves the file alone', async () => {
		const path = await makeProject('one', 'One');
		const library = (await add(path).expect(201)).body as ProjectLibrary;
		await api().patch(`/api/projects/${library.activeId}`).set('Host', HOST).send({ name: ' ' }).expect(400);
		expect(JSON.parse(await readFile(join(path, 'config.json'), 'utf-8')).name).toBe('One');
	});
});

describe('DELETE /api/projects/:id', () => {
	it('by default only unlists: the folder stays, and nothing is open afterwards', async () => {
		const path = await makeProject('one', 'One', ['Ada']);
		const library = (await add(path).expect(201)).body as ProjectLibrary;

		const res = await api().delete(`/api/projects/${library.activeId}`).set('Host', HOST).expect(200);
		expect(res.body).toEqual({ activeId: null, projects: [] });
		expect((await stat(join(path, 'Alphas', 'Ada.md'))).isFile()).toBe(true);
		await api().get('/api/folios').set('Host', HOST).expect(409);
	});

	it('deletes the folder only when the project name is confirmed', async () => {
		const path = await makeProject('one', 'One', ['Ada']);
		const library = (await add(path).expect(201)).body as ProjectLibrary;
		const url = `/api/projects/${library.activeId}`;

		await api().delete(url).query({ deleteFiles: 'true' }).set('Host', HOST).expect(400);
		await api().delete(url).query({ deleteFiles: 'true', confirmName: 'one' }).set('Host', HOST).expect(400);
		expect((await stat(path)).isDirectory()).toBe(true);
		expect((await api().get('/api/projects').set('Host', HOST)).body.projects).toHaveLength(1);

		await api().delete(url).query({ deleteFiles: 'true', confirmName: 'One' }).set('Host', HOST).expect(200);
		await expect(stat(path)).rejects.toThrow();
	});

	it('will not delete a folder that has stopped being a project', async () => {
		const path = await makeProject('one', 'One');
		const first = (await add(path).expect(201)).body as ProjectLibrary;
		await add(await makeProject('two', 'Two')).expect(201);
		await rm(join(path, 'schema.json'));

		const res = await api().delete(`/api/projects/${first.activeId}`)
			.query({ deleteFiles: 'true', confirmName: 'One' }).set('Host', HOST).expect(400);
		expect(res.body.error).toMatch(/no longer looks like a project/);
		expect((await stat(path)).isDirectory()).toBe(true);
	});

	it('will not delete a folder the server itself runs inside', async () => {
		// A project whose folder contains the working directory.
		const path = await makeProject('outer', 'Outer');
		const cwd = vi.spyOn(process, 'cwd').mockReturnValue(join(path, 'Alphas'));
		const library = (await add(path).expect(201)).body as ProjectLibrary;

		const res = await api().delete(`/api/projects/${library.activeId}`)
			.query({ deleteFiles: 'true', confirmName: 'Outer' }).set('Host', HOST).expect(400);
		expect(res.body.error).toMatch(/will not be deleted/);
		expect((await stat(path)).isDirectory()).toBe(true);
		cwd.mockRestore();
	});
});

describe('the registry file', () => {
	it('remembers the list and the open project across a restart', async () => {
		await add(await makeProject('one', 'One')).expect(201);
		const library = (await add(await makeProject('two', 'Two')).expect(201)).body as ProjectLibrary;

		const restarted = new ProjectRegistry(registryPath);
		await restarted.init();
		expect(restarted.activeId).toBe(library.activeId);
		expect((await restarted.list()).projects.map((p) => p.name)).toEqual(['One', 'Two']);
	});

	it('opens the --project path, adding it to the list', async () => {
		const path = await makeProject('cli', 'From The Flag');
		const fresh = new ProjectRegistry(join(root, 'other-home', 'projects.json'));
		await fresh.init({ projectPath: path });
		expect(fresh.activeStore()?.getConfig().name).toBe('From The Flag');
		expect((await fresh.list()).projects).toHaveLength(1);
	});

	it('offers the sample on a first run only', async () => {
		const sample = await makeProject('sample', 'Sample');
		const home = join(root, 'first-run', 'projects.json');
		const first = new ProjectRegistry(home);
		await first.init({ samplePath: sample });
		expect(first.activeStore()?.getConfig().name).toBe('Sample');

		// The user unlists it; the next start must not bring it back.
		await first.remove(first.activeId!);
		const second = new ProjectRegistry(home);
		await second.init({ samplePath: sample });
		expect(await second.list()).toEqual({ activeId: null, projects: [] });
	});

	it('starts with no project open, rather than failing, when the last one will not load', async () => {
		const path = await makeProject('one', 'One');
		await add(path).expect(201);
		await writeFile(join(path, 'schema.json'), 'not json');
		vi.spyOn(console, 'error').mockImplementation(() => {});

		const restarted = new ProjectRegistry(registryPath);
		await restarted.init();
		expect(restarted.activeStore()).toBeNull();
		// Still listed, so it can be fixed and reopened, or removed.
		expect((await restarted.list()).projects).toHaveLength(1);
	});

	it('marks a project whose folder has gone as unavailable', async () => {
		const one = await makeProject('one', 'One');
		await add(one).expect(201);
		await add(await makeProject('two', 'Two')).expect(201);
		await rm(one, { recursive: true });

		const { projects } = (await api().get('/api/projects').set('Host', HOST)).body as ProjectLibrary;
		expect(projects.find((p) => p.path.endsWith('one'))).toMatchObject({ available: false, name: 'one' });
	});

	it('survives a corrupt registry file', async () => {
		await mkdir(join(root, 'broken-home'));
		await writeFile(join(root, 'broken-home', 'projects.json'), '{ not json');
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const broken = new ProjectRegistry(join(root, 'broken-home', 'projects.json'));
		await broken.init();
		expect(await broken.list()).toEqual({ activeId: null, projects: [] });
	});
});
