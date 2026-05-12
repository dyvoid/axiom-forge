#!/usr/bin/env node
// Cross-platform dev launcher.
// Spawns: shared (tsc --watch), server (tsx watch), client (vite).
// Forwards extra CLI args to the server (e.g. --project "C:\path with spaces").
// Spawns Node-resolved binaries directly to avoid npm/shell quoting problems on Windows.

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

function binPath(pkgName, binName)
{
	const pkgDir = resolve(repoRoot, 'node_modules', pkgName);
	const pkg = JSON.parse(readFileSync(resolve(pkgDir, 'package.json'), 'utf8'));
	const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin[binName];
	return resolve(pkgDir, bin);
}

const tscBin = binPath('typescript', 'tsc');
const tsxBin = binPath('tsx', 'tsx');
const viteBin = binPath('vite', 'vite');

const serverArgs = process.argv.slice(2);

const procs = [
	{
		name: 'shared',
		color: '\x1b[35m',
		args: [tscBin, '-p', resolve(repoRoot, 'packages/shared'), '--watch', '--preserveWatchOutput'],
		cwd: repoRoot,
	},
	{
		name: 'server',
		color: '\x1b[33m',
		args: [tsxBin, 'watch', resolve(repoRoot, 'packages/server/src/index.ts'), ...serverArgs],
		cwd: resolve(repoRoot, 'packages/server'),
	},
	{
		name: 'client',
		color: '\x1b[36m',
		args: [viteBin],
		cwd: resolve(repoRoot, 'packages/client'),
	},
];

const reset = '\x1b[0m';
const children = [];
let shuttingDown = false;

function prefixStream(stream, name, color) {
	let buffer = '';
	stream.setEncoding('utf8');
	stream.on('data', (chunk) => {
		buffer += chunk;
		const lines = buffer.split('\n');
		buffer = lines.pop() ?? '';
		for (const line of lines)
		{
			process.stdout.write(`${color}[${name}]${reset} ${line}\n`);
		}
	});
	stream.on('end', () => {
		if (buffer.length > 0)
		{
			process.stdout.write(`${color}[${name}]${reset} ${buffer}\n`);
		}
	});
}

function shutdown(code)
{
	if (shuttingDown)
	{
		return;
	}
	shuttingDown = true;
	for (const child of children)
	{
		if (!child.killed)
		{
			child.kill('SIGTERM');
		}
	}
	setTimeout(() => process.exit(code ?? 0), 250).unref();
}

for (const def of procs)
{
	const child = spawn(process.execPath, def.args, {
		cwd: def.cwd,
		shell: false,
		stdio: ['ignore', 'pipe', 'pipe'],
		env: process.env,
	});
	prefixStream(child.stdout, def.name, def.color);
	prefixStream(child.stderr, def.name, def.color);
	child.on('exit', (code, signal) => {
		process.stdout.write(`${def.color}[${def.name}]${reset} exited (code=${code} signal=${signal})\n`);
		shutdown(code ?? 0);
	});
	children.push(child);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
