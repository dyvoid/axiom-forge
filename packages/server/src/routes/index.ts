import { Router, type IRouter } from 'express';
import type { ProjectRegistry } from '../projectRegistry.js';
import type { ProjectStore } from '../projectStore.js';
import { configRouter } from './config.js';
import { schemaRouter } from './schema.js';
import { themeRouter } from './theme.js';
import { foliosRouter } from './folios.js';
import { projectsRouter } from './projects.js';

/** Every endpoint that serves one project's contents, bound to that project's store. */
export function mountRoutes(app: IRouter, store: ProjectStore): void {
	app.use('/api/config', configRouter(store));
	app.use('/api/schema', schemaRouter(store));
	app.use('/api/theme', themeRouter(store));
	app.use('/api/folios', foliosRouter(store));

	app.get('/api/warnings', (_req, res) => {
		res.json(store.getWarnings());
	});

	app.post('/api/reload', (_req, res) => {
		store.reload()
			.then(() => res.json({ ok: true }))
			.catch((err: unknown) => res.status(500).json({ ok: false, error: String(err) }));
	});

	app.get('/api/search', (req, res) => {
		const raw = req.query.q;
		const q = Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');
		res.json(store.search(String(q)));
	});
}

/** Sent by the client with every request: the project it believes is open. */
export const PROJECT_HEADER = 'x-axiom-project';

/**
 * The whole API: the project list, then the open project's own endpoints.
 *
 * The folio endpoints carry no project id; they serve whichever project is
 * open (ADR-0023). Two things keep that honest. With no project open they
 * answer `409 no-project`. And a client names the project it thinks it is
 * talking to in `X-Axiom-Project`; if another window has switched since, the
 * request is refused with `409 project-changed` rather than read from, or
 * written into, a project the user is not looking at.
 */
export function mountApi(app: IRouter, registry: ProjectRegistry): void {
	app.use('/api/projects', projectsRouter(registry));

	// One router per loaded store, built on first use and dropped with it.
	const routers = new WeakMap<ProjectStore, Router>();

	app.use((req, res, next) => {
		if (!req.path.startsWith('/api/')) {
			next();
			return;
		}
		const store = registry.activeStore();
		if (!store) {
			res.status(409).json({ error: 'no-project' });
			return;
		}
		const claimed = req.get(PROJECT_HEADER);
		if (claimed && claimed !== registry.activeId) {
			res.status(409).json({ error: 'project-changed', activeId: registry.activeId });
			return;
		}
		let router = routers.get(store);
		if (!router) {
			router = Router();
			mountRoutes(router, store);
			routers.set(store, router);
		}
		router(req, res, next);
	});
}
