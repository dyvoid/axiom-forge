import type { Express } from 'express';
import type { ProjectStore } from '../projectStore.js';
import { configRouter } from './config.js';
import { schemaRouter } from './schema.js';
import { foliosRouter } from './folios.js';

export function mountRoutes(app: Express, store: ProjectStore): void {
	app.use('/api/config', configRouter(store));
	app.use('/api/schema', schemaRouter(store));
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
		const q = (req.query.q as string || '');
		res.json(store.search(q));
	});
}
