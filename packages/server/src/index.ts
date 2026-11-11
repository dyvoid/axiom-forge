import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { ProjectRegistry } from './projectRegistry.js';

const PORT = 3000;
const HOST = '127.0.0.1';

/** The `--project` path, if one was given. Opens that project, adding it to the list if new. */
function parseProjectArg(argv: readonly string[]): string | undefined {
	const idx = argv.indexOf('--project');
	if (idx === -1 || idx === argv.length - 1) return undefined;
	return resolve(process.cwd(), argv[idx + 1]!);
}

async function main(): Promise<void> {
	const registry = new ProjectRegistry();
	await registry.init({
		projectPath: parseProjectArg(process.argv.slice(2)),
		// The sample at the repo root (two levels up from packages/server/src),
		// offered on a first run so there is something to look at.
		samplePath: resolve(fileURLToPath(import.meta.url), '../../../..', 'fall-of-troy'),
	});
	if (!registry.activeStore()) {
		console.log('Axiom Forge — no project open; choose one in the browser.');
	}

	createApp(registry).listen(PORT, HOST, () => {
		console.log(`Axiom Forge — http://${HOST}:${PORT}`);
	});
}

main().catch((err) => {
	console.error('Fatal:', err);
	process.exit(1);
});
