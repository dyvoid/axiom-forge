import { describe, expect, it } from 'vitest';
import { ProjectSchemaSchema, type ProjectSchema } from './schema.js';
import { DuplicateFolderError, createSchemaIndex } from './schemaIndex.js';

function schemaOf(types: ProjectSchema['types']): ProjectSchema {
	return ProjectSchemaSchema.parse({ version: '1', types });
}

const sample = schemaOf({
	Alpha: {
		icon: 'a-icon',
		folder: 'Alphas',
		sections: {
			Overview: { role: 'prose', type: 'textarea' },
			Vitals: { role: 'meta', fields: { Age: { type: 'text' } } },
			Notes: { type: 'textarea' },
		},
	},
	Beta: {
		icon: 'b-icon',
		folder: 'Betas',
		sections: {
			Allies: { type: 'wikilink-list', target: 'Alphas' },
		},
	},
});

describe('createSchemaIndex — folder ↔ type', () => {
	const index = createSchemaIndex(sample);

	it('resolves a folder to its type key and def', () => {
		expect(index.typeKeyForFolder('Betas')).toBe('Beta');
		expect(index.typeDefForFolder('Betas')?.icon).toBe('b-icon');
	});

	it('resolves a type key to its folder', () => {
		expect(index.folderForType('Alpha')).toBe('Alphas');
	});

	it('returns undefined for a folder or type the schema does not declare', () => {
		expect(index.typeKeyForFolder('Gammas')).toBeUndefined();
		expect(index.typeDefForFolder('Gammas')).toBeUndefined();
		expect(index.folderForType('Gamma')).toBeUndefined();
	});

	it('exposes type keys and folders in declaration order, parallel to each other', () => {
		expect(index.typeKeys).toEqual(['Alpha', 'Beta']);
		expect(index.folders).toEqual(['Alphas', 'Betas']);
	});

	it('rejects a schema declaring one folder on two types', () => {
		const collide = schemaOf({
			Alpha: { icon: 'a', folder: 'Shared', sections: { S: { type: 'textarea' } } },
			Beta: { icon: 'b', folder: 'Shared', sections: { S: { type: 'textarea' } } },
		});
		expect(() => createSchemaIndex(collide)).toThrow(DuplicateFolderError);
		expect(() => createSchemaIndex(collide)).toThrow(/"Alpha" and "Beta"/);
	});
});

describe('createSchemaIndex — role → section', () => {
	const index = createSchemaIndex(sample);

	it('finds the prose and meta sections by role', () => {
		expect(index.proseSection('Alpha')?.name).toBe('Overview');
		expect(index.metaSection('Alpha')?.name).toBe('Vitals');
	});

	it('returns the section definition alongside its name', () => {
		expect(index.metaSection('Alpha')?.def.fields).toEqual({ Age: { type: 'text' } });
	});

	it('returns undefined when the type declares no section with that role', () => {
		expect(index.proseSection('Beta')).toBeUndefined();
		expect(index.metaSection('Beta')).toBeUndefined();
	});

	it('returns undefined for an unknown type', () => {
		expect(index.proseSection('Gamma')).toBeUndefined();
		expect(index.metaSection('Gamma')).toBeUndefined();
	});
});

describe('createSchemaIndex — sectionsInOrder', () => {
	const index = createSchemaIndex(sample);

	it('lists every section in declaration order', () => {
		expect(index.sectionsInOrder('Alpha').map((s) => s.name)).toEqual([
			'Overview',
			'Vitals',
			'Notes',
		]);
	});

	it('returns an empty list for an unknown type rather than throwing', () => {
		expect(index.sectionsInOrder('Gamma')).toEqual([]);
	});
});

describe('createSchemaIndex — immutability', () => {
	it('freezes the index and the section lists it hands out', () => {
		const index = createSchemaIndex(sample);
		expect(Object.isFrozen(index)).toBe(true);
		expect(Object.isFrozen(index.typeKeys)).toBe(true);
		expect(Object.isFrozen(index.sectionsInOrder('Alpha'))).toBe(true);
	});
});
