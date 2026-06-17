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
			const tags = f.tags.map((t) => t.toLowerCase());
			const aliases = (f.aliases ?? []).map((a) => a.toLowerCase());

			let score = 0;
			if (title === q || name === q) score += 100;
			else if (title.startsWith(q) || name.startsWith(q)) score += 50;
			else if (title.includes(q) || name.includes(q)) score += 10;

			// Aliases are alternative names — score just below the primary title.
			if (aliases.some((a) => a === q)) score += 80;
			else if (aliases.some((a) => a.startsWith(q))) score += 40;
			else if (aliases.some((a) => a.includes(q))) score += 8;

			if (tags.some((t) => t === q)) score += 20;
			else if (tags.some((t) => t.includes(q))) score += 10;

			if (score === 0 && (`${folder}/${name}`.includes(q) || `${folder}/${title}`.includes(q))) score += 5;
			if (snippet.includes(q)) score += 1;

			if (score > 0) {
				results.push({ folio: f, score });
			}
		}
		
		results.sort((a, b) => {
			if (b.score !== a.score) return b.score - a.score;
			return a.folio.title.localeCompare(b.folio.title);
		});

		res.json(results.slice(0, 20).map(r => r.folio));
	});
}
