#!/usr/bin/env node
/**
 * Repo integrity checks that ESLint and markdownlint cannot see.
 *
 * Runs as part of `npm run lint`, so it fires locally and in CI from the same
 * command — no CI-only failures that can't be reproduced on a laptop.
 *
 * 1. Design tokens — every `var(--token)` referenced in the client resolves to a
 *    definition in tokens.css. An undefined custom property is invalid at
 *    computed-value time: the declaration is dropped or silently inherits, with
 *    no console error and nothing for a linter or the type checker to catch.
 *    Six of these had shipped before this check existed, including the hover
 *    background used by the backlinks cards and the search dropdown.
 * 2. Markdown links — relative `.md` links in docs resolve to real files. The
 *    ADR log cross-references itself heavily and ROADMAP links every record.
 * 3. Sample project — `fall-of-troy` wikilinks resolve, except for an explicit
 *    allowlist of entries left broken on purpose (see README).
 * 4. ADR index — every ADR is listed in ROADMAP.md, which is the log's index.
 * 5. Doc line caps — AGENTS.md and PICKUP.md stay under their stated limit. Both
 *    are read first and read often by every agent and every new contributor, so
 *    they carry the basics and link out. Without a check they only ever grow.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const fail = (check, detail) => failures.push({ check, detail });

/** Recursively collect files under `dir` whose extension is in `exts`. */
function walk(dir, exts, out = []) {
	if (!existsSync(dir)) return out;
	for (const entry of readdirSync(dir)) {
		if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, exts, out);
		else if (exts.some((e) => entry.endsWith(e))) out.push(full);
	}
	return out;
}

/**
 * Strip comments before scanning. Without this the checker matches token names
 * mentioned in prose — the comment in EntryContent.module.css that documents
 * this very class of bug would otherwise report itself as a bug.
 */
function stripComments(source) {
	return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

// ── 1. Design tokens ────────────────────────────────────────────

const tokensFile = join(repoRoot, 'packages/client/src/styles/tokens.css');
const defined = new Set(
	[...readFileSync(tokensFile, 'utf-8').matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((m) => m[1]),
);

for (const file of walk(join(repoRoot, 'packages/client/src'), ['.css', '.ts', '.tsx'])) {
	const source = stripComments(readFileSync(file, 'utf-8'));
	const seen = new Set();
	for (const [, token] of source.matchAll(/var\(\s*(--[a-z0-9-]+)/g)) {
		if (defined.has(token) || seen.has(token)) continue;
		seen.add(token);
		fail('design-token', `${relative(repoRoot, file)} uses ${token}, not defined in tokens.css`);
	}
}

// ── 2. Relative markdown links ──────────────────────────────────

const docFiles = [
	...walk(join(repoRoot, 'docs'), ['.md']),
	...['README.md', 'AGENTS.md', 'PICKUP.md'].map((f) => join(repoRoot, f)).filter(existsSync),
];

for (const file of docFiles) {
	for (const [, target] of readFileSync(file, 'utf-8').matchAll(/\]\(([^)\s]+\.md)(?:#[^)\s]*)?\)/g)) {
		if (/^[a-z]+:\/\//.test(target)) continue;
		if (!existsSync(resolve(dirname(file), target))) {
			fail('doc-link', `${relative(repoRoot, file)} links to missing ${target}`);
		}
	}
}

// ── 3. Sample project wikilinks ─────────────────────────────────
//
// Deliberately unwritten entries. Both are figures whose stories continue past
// the fall of the city, so they read as entries nobody has written yet, and
// they give broken-link detection something to find on a fresh clone. Removing
// a name from this list means the entry must now exist. See README.md.

const ALLOWED_BROKEN = new Set(['Humans/Aeneas', 'Humans/Astyanax']);

const sampleRoot = join(repoRoot, 'fall-of-troy');
const sampleTargets = new Set();
for (const file of walk(sampleRoot, ['.md'])) {
	for (const [, target] of readFileSync(file, 'utf-8').matchAll(/\[\[([^\]|#]+)/g)) {
		sampleTargets.add(target.trim());
	}
}

for (const target of [...sampleTargets].sort()) {
	const exists = existsSync(join(sampleRoot, `${target}.md`));
	if (!exists && !ALLOWED_BROKEN.has(target)) {
		fail('sample-link', `fall-of-troy wikilink [[${target}]] has no entry (add it, or allowlist it)`);
	}
	if (exists && ALLOWED_BROKEN.has(target)) {
		fail('sample-link', `${target} is allowlisted as deliberately broken but now exists — drop it from ALLOWED_BROKEN`);
	}
}

// ── 4. Every ADR appears in the ROADMAP ─────────────────────────

const roadmap = readFileSync(join(repoRoot, 'docs/ROADMAP.md'), 'utf-8');
for (const entry of readdirSync(join(repoRoot, 'docs/adr'))) {
	if (!/^\d{4}-.*\.md$/.test(entry)) continue;
	if (!roadmap.includes(entry)) {
		fail('adr-index', `docs/adr/${entry} is not referenced from docs/ROADMAP.md`);
	}
}

// ── 5. Doc line caps ────────────────────────────────────────────
//
// The cap is stated in each file itself, so it survives being read in isolation.
// Going over means moving detail into docs/ and linking to it — never deleting
// substance to fit.

const LINE_CAP = 120;

for (const name of ['AGENTS.md', 'PICKUP.md']) {
	const file = join(repoRoot, name);
	if (!existsSync(file)) continue;
	const lines = readFileSync(file, 'utf-8').split('\n');
	if (lines[lines.length - 1] === '') lines.pop();
	if (lines.length > LINE_CAP) {
		fail('doc-length', `${name} is ${lines.length} lines, over the ${LINE_CAP}-line cap — move detail into docs/ and link to it`);
	}
}

// ── Report ──────────────────────────────────────────────────────

if (failures.length === 0) {
	console.log('repo checks passed');
	process.exit(0);
}

const byCheck = new Map();
for (const { check, detail } of failures) {
	if (!byCheck.has(check)) byCheck.set(check, []);
	byCheck.get(check).push(detail);
}
for (const [check, details] of byCheck) {
	console.error(`\n${check} (${details.length}):`);
	for (const d of details) console.error(`  ${d}`);
}
console.error(`\n${failures.length} repo check failure(s)`);
process.exit(1);
