import express from 'express';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ProjectStore } from './projectStore.js';
import { mountRoutes } from './routes/index.js';

const PORT = 3000;
const HOST = '127.0.0.1';

function parseProjectArg(argv: readonly string[]): string {
	const idx = argv.indexOf('--project');
	if (idx === -1 || idx === argv.length - 1) {
		// Default to fall-of-troy at the repo root (two levels up from packages/server/src)
		return resolve(fileURLToPath(import.meta.url), '../../../..', 'fall-of-troy');
	}
	const raw = argv[idx + 1]!;
	return resolve(process.cwd(), raw);
}

async function main(): Promise<void> {
	const projectPath = parseProjectArg(process.argv.slice(2));
	console.log(`Axiom Forge — loading project: ${projectPath}`);

	const store = new ProjectStore(projectPath);
	await store.load();

	const app = express();
	app.use(express.json());
	mountRoutes(app, store);

	app.listen(PORT, HOST, () => {
		console.log(`Axiom Forge — http://${HOST}:${PORT}`);
	});
}

main().catch((err) => {
	console.error('Fatal:', err);
	process.exit(1);
});
