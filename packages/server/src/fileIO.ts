/**
 * File I/O for reading folio .md files.
 * All disk access goes through this module — no route or store reads files directly.
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';

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
