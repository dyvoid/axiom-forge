import { Router, type Response } from 'express';
import type { ProjectRegistry } from '../projectRegistry.js';
import { BadRequestError, NotAProjectError, NotFoundError, ProjectLoadError } from '../storeErrors.js';

/** Map a registry error to a response. Returns false for anything it does not recognise. */
function sendRegistryError(err: unknown, res: Response): boolean {
	if (err instanceof BadRequestError) {
		res.status(400).json({ error: err.message });
		return true;
	}
	if (err instanceof NotFoundError) {
		res.status(404).json({ error: err.message });
		return true;
	}
	if (err instanceof NotAProjectError) {
		res.status(404).json({ error: 'not-a-project', path: err.path, canCreate: err.canCreate });
		return true;
	}
	if (err instanceof ProjectLoadError) {
		res.status(422).json({ error: 'invalid-project', reason: err.reason });
		return true;
	}
	return false;
}

/**
 * The project list (ADR-0023). Every route answers with the whole list, so
 * the client replaces its copy instead of patching it.
 */
export function projectsRouter(registry: ProjectRegistry): Router {
	const r = Router();

	const respond = (res: Response, action: string, work: Promise<unknown>, status = 200): void => {
		work
			.then((library) => res.status(status).json(library))
			.catch((err: unknown) => {
				if (sendRegistryError(err, res)) return;
				console.error(`Error ${action}:`, err);
				res.status(500).json({ error: `Failed ${action}: ${err instanceof Error ? err.message : String(err)}` });
			});
	};

	// GET /api/projects — every known project, and which one is open
	r.get('/', (_req, res) => {
		respond(res, 'listing projects', registry.list());
	});

	// POST /api/projects { path, create? } — add a folder and open it
	r.post('/', (req, res) => {
		const body = (req.body ?? {}) as { path?: unknown; create?: unknown };
		respond(res, 'adding the project', registry.add(body.path, body.create), 201);
	});

	// POST /api/projects/:id/activate — open a listed project
	r.post('/:id/activate', (req, res) => {
		respond(res, 'opening the project', registry.activate(req.params.id));
	});

	// PATCH /api/projects/:id { name, description?, version? } — edit its config.json
	r.patch('/:id', (req, res) => {
		respond(res, 'saving the project settings', registry.updateConfig(req.params.id, req.body));
	});

	// DELETE /api/projects/:id?deleteFiles=true&confirmName= — unlist, optionally deleting the folder
	r.delete('/:id', (req, res) => {
		const confirmName = typeof req.query.confirmName === 'string' ? req.query.confirmName : undefined;
		respond(res, 'removing the project', registry.remove(req.params.id, {
			deleteFiles: req.query.deleteFiles === 'true',
			confirmName,
		}));
	});

	return r;
}
