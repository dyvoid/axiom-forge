// Shared runtime/transport types used by both the server API and the
// React client. Phase 0 keeps this file small; Phase 1 will populate
// it with the parsed-folio shape.

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
	name: string;
	status?: FolioStatus;
	tags: string[];
}
