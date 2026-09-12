import { Router } from 'express';
import type { ProjectStore } from '../projectStore.js';

export function themeRouter(store: ProjectStore): Router {
	const r = Router();
	r.get('/', (_req, res) => {
		res.json(store.getTheme());
	});
	return r;
}
