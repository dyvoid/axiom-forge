import { Router } from 'express';
import type { ProjectStore } from '../projectStore.js';

export function configRouter(store: ProjectStore): Router {
	const r = Router();
	r.get('/', (_req, res) => {
		res.json(store.getConfig());
	});
	return r;
}
