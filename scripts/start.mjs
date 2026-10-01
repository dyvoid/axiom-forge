#!/usr/bin/env node
// Runs the compiled server with forwarded CLI args.

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const serverEntry = resolve(repoRoot, 'packages/server/dist/index.js');

// A relative `--project` means relative to where `npm start` was typed (npm
// sets INIT_CWD to it), not to the repo root the server is started in.
const args = process.argv.slice(2);
const projectIdx = args.indexOf('--project');
if (projectIdx !== -1 && projectIdx + 1 < args.length)
{
	args[projectIdx + 1] = resolve(process.env.INIT_CWD ?? process.cwd(), args[projectIdx + 1]);
}

const child = spawn(process.execPath, [serverEntry, ...args], {
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
