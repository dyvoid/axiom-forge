#!/usr/bin/env node
// Cross-platform dev launcher.
// Spawns: shared (tsc --watch), server (tsx watch), client (vite).
// Forwards extra CLI args to the server (e.g. --project "C:\path with spaces").
// Spawns Node-resolved binaries directly to avoid npm/shell quoting problems on Windows.
// Opens the default browser once Vite reports its URL; set AXIOM_FORGE_NO_OPEN=1 to skip.

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
		onLine: watchForViteUrl,
	},
];

const reset = '\x1b[0m';
const children = [];
let shuttingDown = false;

/**
 * Open `url` in the platform's default browser.
 *
 * Lives here rather than in start.sh/start.bat so there is one implementation
 * instead of one per launcher, and so a plain `npm run dev` behaves the same as
 * a double-clicked launcher.
 *
 * Failure is non-fatal: a headless box, a container, or a machine with no
 * xdg-open should still get a working dev server, just without the browser.
 */
const opened = new Set();

function openBrowser(url)
{
	if (process.env.AXIOM_FORGE_NO_OPEN || opened.has(url))
	{
		return;
	}
	opened.add(url);

	// `start` treats a leading quoted argument as the window title, so it needs
	// an empty one before the URL or a quoted path would be swallowed.
	const [command, args] = process.platform === 'win32'
		? ['cmd', ['/c', 'start', '', url]]
		: process.platform === 'darwin'
			? ['open', [url]]
			: ['xdg-open', [url]];

	const child = spawn(command, args, { stdio: 'ignore', detached: true });
	child.on('error', () => {
		process.stdout.write(`Could not open a browser automatically — open ${url}\n`);
	});
	child.unref();
}

/** Vite prints its URL once it is actually listening, which is the cue to open. */
const ansi = /\x1b\[[0-9;]*m/g;
const viteLocalUrl = /Local:\s+(https?:\/\/\S+?)\/?$/;

function watchForViteUrl(line)
{
	const match = viteLocalUrl.exec(line.replace(ansi, '').trimEnd());
	if (match)
	{
		openBrowser(match[1]);
	}
}

function prefixStream(stream, name, color, onLine) {
	let buffer = '';
	stream.setEncoding('utf8');
	stream.on('data', (chunk) => {
		buffer += chunk;
		const lines = buffer.split('\n');
		buffer = lines.pop() ?? '';
		for (const line of lines)
		{
			process.stdout.write(`${color}[${name}]${reset} ${line}\n`);
			onLine?.(line);
		}
	});
	stream.on('end', () => {
		if (buffer.length > 0)
		{
			process.stdout.write(`${color}[${name}]${reset} ${buffer}\n`);
			onLine?.(buffer);
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
	prefixStream(child.stdout, def.name, def.color, def.onLine);
	prefixStream(child.stderr, def.name, def.color, def.onLine);
	child.on('exit', (code, signal) => {
		process.stdout.write(`${def.color}[${def.name}]${reset} exited (code=${code} signal=${signal})\n`);
		shutdown(code ?? 0);
	});
	children.push(child);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
