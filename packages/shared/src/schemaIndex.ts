import type { ProjectSchema, SectionDef, TypeDef } from './schema.js';

/**
 * A section paired with the name it is declared under. Section names are map
 * keys in the schema, so a section passed around on its own has lost the one
 * thing consumers need to look up its data in a folio.
 */
export interface SectionEntry {
	name: string;
	def: SectionDef;
}

/**
 * Pre-computed lookups over a validated `ProjectSchema`.
 *
 * Every fact *about* the schema that consumers need — which type owns a folder,
 * which section carries a role — is answered here rather than by scanning
 * `schema.types` at the call site. See
 * [ADR-0019](../../../docs/adr/0019-schema-index.md).
 */
export interface SchemaIndex {
	/** Type keys in schema declaration order. */
	readonly typeKeys: readonly string[];
	/** Folders in schema declaration order — parallel to `typeKeys`. */
	readonly folders: readonly string[];
	typeKeyForFolder(folder: string): string | undefined;
	typeDefForFolder(folder: string): TypeDef | undefined;
	folderForType(typeKey: string): string | undefined;
	/** The `role: "prose"` section, or undefined if the type declares none. */
	proseSection(typeKey: string): SectionEntry | undefined;
	/** The `role: "meta"` section, or undefined if the type declares none. */
	metaSection(typeKey: string): SectionEntry | undefined;
	/** All sections of a type in declaration order; empty for an unknown type. */
	sectionsInOrder(typeKey: string): readonly SectionEntry[];
}

/**
 * Thrown when two types claim the same folder. The on-disk layout and
 * `[[Folder/Name]]` resolution both depend on a folder mapping to exactly one
 * type; before this index that rule was assumed at ten call sites and a
 * violation resolved silently to whichever type came first.
 */
export class DuplicateFolderError extends Error {
	constructor(public readonly folder: string, public readonly typeKeys: [string, string]) {
		super(
			`Schema declares folder "${folder}" on more than one type `
			+ `("${typeKeys[0]}" and "${typeKeys[1]}"). A folder must map to exactly one type.`,
		);
		this.name = 'DuplicateFolderError';
	}
}

function sectionWithRole(typeDef: TypeDef, role: 'meta' | 'prose'): SectionEntry | undefined {
	for (const [name, def] of Object.entries(typeDef.sections)) {
		if (def.role === role) return { name, def };
	}
	return undefined;
}

/**
 * Build the lookup index for a schema. Pure: no I/O, no folio data, no React.
 *
 * Call it once per schema load — `ProjectStore.load()`/`reload()` on the server,
 * `ProjectContext` on the client — and read the schema through the result.
 *
 * @throws {DuplicateFolderError} if two types declare the same folder. That is a
 * schema the app cannot serve coherently, and load is the only place it can be
 * reported against the file the user can fix.
 */
export function createSchemaIndex(schema: ProjectSchema): SchemaIndex {
	const typeKeys = Object.keys(schema.types);
	const byFolder = new Map<string, { typeKey: string; typeDef: TypeDef }>();
	const folderByType = new Map<string, string>();
	const prose = new Map<string, SectionEntry>();
	const meta = new Map<string, SectionEntry>();
	const sections = new Map<string, readonly SectionEntry[]>();

	for (const [typeKey, typeDef] of Object.entries(schema.types)) {
		const claimed = byFolder.get(typeDef.folder);
		if (claimed) throw new DuplicateFolderError(typeDef.folder, [claimed.typeKey, typeKey]);
		byFolder.set(typeDef.folder, { typeKey, typeDef });
		folderByType.set(typeKey, typeDef.folder);

		const proseEntry = sectionWithRole(typeDef, 'prose');
		if (proseEntry) prose.set(typeKey, proseEntry);
		const metaEntry = sectionWithRole(typeDef, 'meta');
		if (metaEntry) meta.set(typeKey, metaEntry);

		sections.set(
			typeKey,
			Object.freeze(Object.entries(typeDef.sections).map(([name, def]) => ({ name, def }))),
		);
	}

	const empty: readonly SectionEntry[] = Object.freeze([]);

	return Object.freeze({
		typeKeys: Object.freeze(typeKeys),
		folders: Object.freeze(typeKeys.map((k) => folderByType.get(k)!)),
		typeKeyForFolder: (folder: string) => byFolder.get(folder)?.typeKey,
		typeDefForFolder: (folder: string) => byFolder.get(folder)?.typeDef,
		folderForType: (typeKey: string) => folderByType.get(typeKey),
		proseSection: (typeKey: string) => prose.get(typeKey),
		metaSection: (typeKey: string) => meta.get(typeKey),
		sectionsInOrder: (typeKey: string) => sections.get(typeKey) ?? empty,
	});
}
