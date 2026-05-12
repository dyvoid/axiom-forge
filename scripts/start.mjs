#!/usr/bin/env node
// Runs the compiled server with forwarded CLI args.

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const serverEntry = resolve(repoRoot, 'packages/server/dist/index.js');

const child = spawn(process.execPath, [serverEntry, ...process.argv.slice(2)], {
	cwd: repoRoot,
	stdio: 'inherit',
	env: process.env,
});

child.on('exit', (code, signal) => {
	if (signal)
	{
		process.kill(process.pid, signal);
		return;
	}
	process.exit(code ?? 0);
});
