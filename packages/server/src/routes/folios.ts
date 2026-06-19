import { Router, type Response } from 'express';
import type { ParsedFolio } from '@axiom-forge/shared';
import type { ProjectStore } from '../projectStore.js';
import {
	ValidationError,
	NotFoundError,
	BadRequestError,
	InvalidTitleError,
	ConflictError,
	RenameFailedError,
	LinkRewriteFailedError,
} from '../storeErrors.js';

/**
 * Map a ProjectStore domain error to an HTTP response. Returns true if the
 * error was a known domain error and a response was sent; false otherwise (the
 * caller should then emit a generic 500).
 */
function sendDomainError(err: unknown, res: Response): boolean {
	if (err instanceof ValidationError) {
		res.status(400).json({ error: err.code, issues: err.issues });
		return true;
	}
	if (err instanceof BadRequestError) {
		res.status(400).json({ error: err.message });
		return true;
	}
	if (err instanceof InvalidTitleError) {
		res.status(400).json({ error: 'invalid-title', reason: 'empty-after-sanitization' });
		return true;
	}
	if (err instanceof NotFoundError) {
		res.status(404).json({ error: err.message });
		return true;
	}
	if (err instanceof ConflictError) {
		res.status(409).json(
			err.detail.kind === 'stale'
				? { error: 'conflict', serverMtime: err.detail.serverMtime }
				: { error: 'exists', name: err.detail.name },
		);
		return true;
	}
	if (err instanceof RenameFailedError) {
		res.status(500).json({ error: 'rename-failed', reason: err.reason });
		return true;
	}
	if (err instanceof LinkRewriteFailedError) {
		res.status(500).json({ error: 'link-rewrite-failed', reason: err.reason, renamedTo: err.renamedTo });
		return true;
	}
	return false;
}

export function foliosRouter(store: ProjectStore): Router {
	const r = Router();

	// GET /api/folios — all folio index records (for sidebar)
	r.get('/', (_req, res) => {
		res.json(store.getFolios());
	});

	// GET /api/folios/:folder/:name — single parsed folio
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

	// GET /api/folios/:folder/:name/backlinks — folios linking to this one
	r.get('/:folder/:name/backlinks', (req, res) => {
		const { folder, name } = req.params;
		if (!folder || !name) {
			res.status(400).json({ error: 'Folder and name required' });
			return;
		}
		try {
			res.json(store.getBacklinks(folder, name));
		} catch (err) {
			console.error(`Error fetching backlinks for ${folder}/${name}:`, err);
			res.status(500).json({ error: 'Failed to fetch backlinks' });
		}
	});

	// PUT /api/folios/:folder/:name — save (and optionally rename) a folio.
	r.put('/:folder/:name', async (req, res) => {
		const { folder, name } = req.params;
		const body = req.body as { folio?: ParsedFolio; clientMtime?: number };
		if (!body || typeof body !== 'object' || !body.folio || typeof body.clientMtime !== 'number') {
			res.status(400).json({ error: 'Body must be { folio, clientMtime }' });
			return;
		}
		try {
			const result = await store.saveFolio(folder!, name!, body.folio, body.clientMtime);
			res.json(result);
		} catch (err) {
			if (sendDomainError(err, res)) return;
			console.error(`Error saving folio ${folder}/${name}:`, err);
			if (!res.headersSent) res.status(500).json({ error: 'Failed to save folio' });
		}
	});

	// POST /api/folios/:folder — create a new folio
	r.post('/:folder', async (req, res) => {
		const { folder } = req.params;
		const body = req.body as { folio?: ParsedFolio };
		if (!body?.folio) {
			res.status(400).json({ error: 'Body must be { folio }' });
			return;
		}
		try {
			const result = await store.createFolio(folder!, body.folio);
			res.status(201).json(result);
		} catch (err) {
			if (sendDomainError(err, res)) return;
			console.error(`Error creating folio in ${folder}:`, err);
			if (!res.headersSent) res.status(500).json({ error: 'Failed to create folio' });
		}
	});

	// DELETE /api/folios/:folder/:name — delete a folio
	r.delete('/:folder/:name', async (req, res) => {
		const { folder, name } = req.params;
		try {
			await store.deleteFolio(folder!, name!);
			res.json({ ok: true });
		} catch (err) {
			if (sendDomainError(err, res)) return;
			console.error(`Error deleting folio ${folder}/${name}:`, err);
			if (!res.headersSent) res.status(500).json({ error: 'Failed to delete folio' });
		}
	});

	return r;
}
