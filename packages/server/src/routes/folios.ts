import { Router } from 'express';
import type { ProjectStore } from '../projectStore.js';

export function foliosRouter(store: ProjectStore): Router {
	const r = Router();

	// GET /api/folios — all folio index records (for sidebar)
	r.get('/', (_req, res) => {
		res.json(store.getFolios());
	});

	// GET /api/folios/:type/:name — single parsed folio
	r.get('/:folder/:name', async (req, res) => {
		const { folder, name } = req.params;
		try {
			const folio = await store.getFolio(folder!, name!);
			if (!folio) {
				res.status(404).json({ error: 'Folio not found' });
				return;
			}
			res.json(folio);
		} catch (err) {
			console.error(`Error reading folio ${folder}/${name}:`, err);
			res.status(500).json({ error: 'Failed to read folio' });
		}
	});

	return r;
}
