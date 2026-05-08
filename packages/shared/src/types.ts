// Shared runtime/transport types used by both the server API and the
// React client.

// ── Wiki-Links ──────────────────────────────────────────────

export interface WikiLink {
	/** Folder name from the wiki-link path (e.g. "Characters") */
	folder: string;
	/** Folio filename stem — underscores, not spaces (e.g. "Mycenaean_Invasion_of_Kea") */
	name: string;
	/** Optional display alias from [[path|alias]] syntax */
	alias?: string;
}

// ── Field Values ────────────────────────────────────────────

export type FieldValue =
	| string
	| string[]
	| WikiLink
	| WikiLink[]
	| null;

// ── Parsed Folio ────────────────────────────────────────────

/**
 * A section in a parsed folio. Exactly one of `content`, `value`, or
 * `fields` will be populated depending on the section's schema definition:
 *
 * - `content` → textarea / prose sections (free text)
 * - `value`   → section-level typed values (e.g. a top-level wikilink-list)
 * - `fields`  → structured field sections (key-value pairs)
 */
export interface ParsedSection {
	content?: string;
	value?: FieldValue;
	fields?: Record<string, FieldValue>;
}

export interface ParsedFolio {
	name: string;
	type: string;
	folder: string;
	status?: string;
	tags: string[];
	sections: Record<string, ParsedSection>;
	warnings?: string[];
	mtime?: number;
}

// ── Folio Index (sidebar / list) ────────────────────────────

export type FolioStatus =
	| 'Active'
	| 'Living'
	| 'Deceased'
	| 'Dissolved'
	| 'Destroyed'
	| 'Unknown'
	// eslint-disable-next-line @typescript-eslint/ban-types
	| (string & {}); // open enum: schemas may declare more

export interface FolioIndexRecord {
	id: number;
	type: string;
	folder: string;
	name: string;
	status?: FolioStatus;
	tags: string[];
	snippet?: string;
}
