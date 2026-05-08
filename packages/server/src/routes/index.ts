import type { Express } from 'express';
import type { ProjectStore } from '../projectStore.js';
import { configRouter } from './config.js';
import { schemaRouter } from './schema.js';

export function mountRoutes(app: Express, store: ProjectStore): void {
	app.use('/api/config', configRouter(store));
	app.use('/api/schema', schemaRouter(store));
}
