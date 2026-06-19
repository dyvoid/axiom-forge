/**
 * File I/O for reading folio .md files.
 * All disk access goes through this module — no route or store reads files directly.
 */

import { readFile, readdir, stat, writeFile, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';

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
