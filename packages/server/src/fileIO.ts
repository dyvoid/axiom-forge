/**
 * File I/O for reading folio .md files.
 * All disk access goes through this module — no route or store reads files directly.
 */

import { readFile, readdir, stat, writeFile, rename, unlink, mkdir, realpath } from 'node:fs/promises';
import { basename, extname, isAbsolute, join, relative, resolve } from 'node:path';

export interface FileInfo {
	name: string;
	filePath: string;
	mtime: number;
	birthtime: number;
}

/**
 * Scan a folder for .md files and return their metadata.
 */
export async function scanFolder(folderPath: string): Promise<FileInfo[]> {
	let entries: string[];
	try {
		entries = await readdir(folderPath);
	} catch {
		return []; // folder doesn't exist yet — that's ok
	}
	const results: FileInfo[] = [];
	for (const entry of entries) {
		if (!entry.endsWith('.md')) continue;
		const filePath = join(folderPath, entry);
		const stats = await stat(filePath);
		if (!stats.isFile()) continue;
		results.push({
			name: entry.slice(0, -3), // strip .md
			filePath,
			mtime: stats.mtimeMs,
			birthtime: stats.birthtimeMs,
		});
	}
	return results;
}

/**
 * Read a .md file and return its contents + mtime.
 */
export async function readFolioFile(filePath: string): Promise<{ content: string; mtime: number }> {
	const [content, stats] = await Promise.all([
		readFile(filePath, 'utf-8'),
		stat(filePath),
	]);
	return { content, mtime: stats.mtimeMs };
}

/**
 * Write a .md file and return the new mtime.
 */
export async function writeFolioFile(filePath: string, content: string): Promise<{ mtime: number }> {
	const tempPath = filePath + '.tmp';
	await writeFile(tempPath, content, 'utf-8');
	await rename(tempPath, filePath);
	const stats = await stat(filePath);
	return { mtime: stats.mtimeMs };
}

/**
 * Rename a folio file and return the new mtime.
 */
export async function renameFolioFile(oldPath: string, newPath: string): Promise<{ mtime: number }> {
	await rename(oldPath, newPath);
	const stats = await stat(newPath);
	return { mtime: stats.mtimeMs };
}

/**
 * Delete a folio file from disk.
 */
export async function deleteFolioFile(filePath: string): Promise<void> {
	await unlink(filePath);
}

/**
 * Stat a single file. Returns null if it doesn't exist.
 */
export async function statFile(filePath: string): Promise<{ mtime: number } | null> {
	try {
		const stats = await stat(filePath);
		return { mtime: stats.mtimeMs };
	} catch {
		return null;
	}
}

export type ImageResolution =
	| { filePath: string; error?: undefined }
	| { filePath?: undefined; error: 'missing' | 'ambiguous' | 'outside-project' };

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

export function isAllowedImageName(fileName: string): boolean {
	return IMAGE_EXTENSIONS.has(extname(fileName).toLowerCase());
}

function isInside(rootPath: string, candidatePath: string): boolean {
	const rel = relative(rootPath, candidatePath);
	return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

async function collectNamedFiles(folderPath: string, targetName: string, results: string[]): Promise<void> {
	const entries = await readdir(folderPath, { withFileTypes: true }).catch(() => []);
	for (const entry of entries) {
		if (entry.name === '.git' || entry.name === 'node_modules') continue;
		const entryPath = join(folderPath, entry.name);
		if (entry.isDirectory()) {
			await collectNamedFiles(entryPath, targetName, results);
		} else if (entry.isFile() && entry.name.toLowerCase() === targetName.toLowerCase()) {
			results.push(entryPath);
		}
	}
}

export async function resolveImageFile(projectPath: string, imagePath: string): Promise<ImageResolution> {
	let decodedPath: string;
	try {
		decodedPath = decodeURIComponent(imagePath);
	} catch {
		return { error: 'missing' };
	}
	if (!isAllowedImageName(decodedPath) || isAbsolute(decodedPath)) return { error: 'outside-project' };
	const rootPath = await realpath(projectPath);
	if (decodedPath.includes('/') || decodedPath.includes('\\')) {
		const candidate = resolve(rootPath, decodedPath);
		if (!isInside(rootPath, candidate)) return { error: 'outside-project' };
		const actual = await realpath(candidate).catch(() => null);
		if (!actual) return { error: 'missing' };
		const fileStat = await stat(actual).catch(() => null);
		return fileStat?.isFile() && isInside(rootPath, actual) ? { filePath: actual } : { error: 'outside-project' };
	}
	const matches: string[] = [];
	await collectNamedFiles(rootPath, decodedPath, matches);
	if (matches.length === 0) return { error: 'missing' };
	if (matches.length > 1) return { error: 'ambiguous' };
	const actual = await realpath(matches[0]!);
	return isInside(rootPath, actual) ? { filePath: actual } : { error: 'outside-project' };
}

export async function writeProjectImage(
	projectPath: string,
	fileName: string,
	content: Buffer,
): Promise<{ path: string; filePath: string }> {
	const leafName = basename(fileName);
	if (leafName !== fileName || !isAllowedImageName(leafName)) throw new Error('Unsupported image filename');
	const rootPath = await realpath(projectPath);
	const imageDir = resolve(rootPath, 'Images');
	await mkdir(imageDir, { recursive: true });
	const actualImageDir = await realpath(imageDir);
	if (!isInside(rootPath, actualImageDir)) throw new Error('Image folder resolves outside the project');
	const extension = extname(leafName);
	const stem = leafName.slice(0, -extension.length).replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '') || 'image';
	let targetName = `${stem}${extension.toLowerCase()}`;
	let suffix = 2;
	while (await statFile(join(actualImageDir, targetName))) targetName = `${stem}_${suffix++}${extension.toLowerCase()}`;
	const filePath = join(actualImageDir, targetName);
	const tempPath = `${filePath}.tmp`;
	await writeFile(tempPath, content);
	await rename(tempPath, filePath);
	return { path: `Images/${targetName}`, filePath };
}

export async function deleteImageFile(filePath: string): Promise<void> {
	await unlink(filePath);
}
