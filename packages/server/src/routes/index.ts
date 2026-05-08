import type { Express } from 'express';
import type { ProjectStore } from '../projectStore.js';
import { configRouter } from './config.js';
import { schemaRouter } from './schema.js';
import { foliosRouter } from './folios.js';

export function mountRoutes(app: Express, store: ProjectStore): void {
	app.use('/api/config', configRouter(store));
	app.use('/api/schema', schemaRouter(store));
	app.use('/api/folios', foliosRouter(store));

	app.post('/api/reload', (_req, res) => {
		store.reload()
			.then(() => res.json({ ok: true }))
			.catch((err: unknown) => res.status(500).json({ ok: false, error: String(err) }));
	});
}
