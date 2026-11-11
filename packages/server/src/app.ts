import express, { type Express } from 'express';
import type { ProjectRegistry } from './projectRegistry.js';
import { localOnly } from './localOnly.js';
import { mountApi } from './routes/index.js';

/** The Express app, without a listener — so tests can drive it directly. */
export function createApp(registry: ProjectRegistry): Express {
	const app = express();
	app.use(localOnly);
	// express.json() defaults to 100 kB, which a long prose folio passes; the
	// save then fails with a 413. Match the cover-image upload limit instead.
	app.use(express.json({ limit: '10mb' }));
	mountApi(app, registry);
	return app;
}
