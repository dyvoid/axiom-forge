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
		const q = (req.query.q as string || '').trim().toLowerCase();
		if (!q) {
			res.json([]);
			return;
		}
		
		const results = [];
		for (const f of store.getFolios()) {
			const title = f.title.toLowerCase();
			const name = f.name.replace(/_/g, ' ').toLowerCase();
			const snippet = (f.snippet || '').toLowerCase();
			const folder = f.folder.toLowerCase();
			if (
				title.includes(q) ||
				name.includes(q) ||
				`${folder}/${name}`.includes(q) ||
				`${folder}/${title}`.includes(q) ||
				snippet.includes(q)
			) {
				results.push(f);
				if (results.length >= 20) break;
			}
		}
		res.json(results);
	});
}
