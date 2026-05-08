import { Router } from 'express';
import { parseMarkdown, serializeToMarkdown, type ParsedFolio } from '@axiom-forge/shared';
import type { ProjectStore } from '../projectStore.js';
import { readFolioFile, writeFolioFile, statFile } from '../fileIO.js';

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

	// PUT /api/folios/:folder/:name — save an existing folio
	r.put('/:folder/:name', async (req, res) => {
		const { folder, name } = req.params;
		const body = req.body as { folio?: ParsedFolio; clientMtime?: number };

		if (!body || typeof body !== 'object' || !body.folio || typeof body.clientMtime !== 'number') {
			res.status(400).json({ error: 'Body must be { folio, clientMtime }' });
			return;
		}

		const record = store.getRecord(folder!, name!);
		if (!record) {
			res.status(404).json({ error: 'Folio not found' });
			return;
		}

		const stat = await statFile(record.filePath);
		if (!stat) {
			res.status(404).json({ error: 'File missing on disk' });
			return;
		}
		// Allow ~5ms of slop for filesystems with coarse mtime resolution.
		if (Math.abs(stat.mtime - body.clientMtime) > 5) {
			res.status(409).json({ error: 'conflict', serverMtime: stat.mtime });
			return;
		}

		try {
			const schema = store.getSchema();
			const markdown = serializeToMarkdown(body.folio, schema);
			const { mtime } = await writeFolioFile(record.filePath, markdown);

			// Re-parse so we get the same warnings the client would see on next GET.
			const reparsed = parseMarkdown(markdown, schema);
			const snippet = store.deriveSnippet(reparsed);
			store.updateFolioRecord(folder!, name!, {
				mtime,
				status: reparsed.status,
				tags: reparsed.tags,
				snippet,
			});

			res.json({
				mtime,
				warnings: reparsed.warnings ?? [],
			});
		} catch (err) {
			console.error(`Error saving folio ${folder}/${name}:`, err);
			res.status(500).json({ error: 'Failed to save folio' });
		}
	});

	return r;
}
