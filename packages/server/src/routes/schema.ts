import { Router } from 'express';
import type { ProjectStore } from '../projectStore.js';

export function schemaRouter(store: ProjectStore): Router {
	const r = Router();
	r.get('/', (_req, res) => {
		res.json(store.getSchema());
	});
	return r;
}
