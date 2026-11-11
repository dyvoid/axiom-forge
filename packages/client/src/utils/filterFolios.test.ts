import { describe, expect, it } from 'vitest';
import type { FolioIndexRecord } from '@axiom-forge/shared';
import { collectTags, filterFolios } from './filterFolios.js';

function folio(name: string, tags: string[], extra: Partial<FolioIndexRecord> = {}): FolioIndexRecord {
	return { id: 0, type: 'Thing', folder: 'Things', name, title: name.replace(/_/g, ' '), tags, ...extra };
}

// Deliberately not alphabetical, so `given` and `relevance` are distinguishable.
const folios = [
	folio('Zephyr', ['wind', 'minor']),
	folio('Boreas', ['wind', 'major']),
	folio('Aeolus', ['king'], { aliases: ['Keeper of the Winds'] }),
	folio('North_Wind_Shrine', ['place'], { snippet: 'Where Boreas is honoured.' }),
];
const names = (list: FolioIndexRecord[]) => list.map((f) => f.name);

describe('filterFolios', () => {
	it('returns everything, in the order given, when nothing narrows it', () => {
		expect(names(filterFolios({ folios, query: '', tags: [], order: 'given' })))
			.toEqual(['Zephyr', 'Boreas', 'Aeolus', 'North_Wind_Shrine']);
	});

	it('sorts by title under `relevance` when there is no query', () => {
		expect(names(filterFolios({ folios, query: '  ', tags: [], order: 'relevance' })))
			.toEqual(['Aeolus', 'Boreas', 'North_Wind_Shrine', 'Zephyr']);
	});

	it('requires every selected tag', () => {
		expect(names(filterFolios({ folios, query: '', tags: ['wind'], order: 'given' }))).toEqual(['Zephyr', 'Boreas']);
		expect(names(filterFolios({ folios, query: '', tags: ['wind', 'major'], order: 'given' }))).toEqual(['Boreas']);
		expect(filterFolios({ folios, query: '', tags: ['wind', 'king'], order: 'given' })).toEqual([]);
	});

	it('matches a query through titles, aliases and snippets alike', () => {
		// "wind" hits a title, an alias and a tag; `given` keeps the incoming order.
		expect(names(filterFolios({ folios, query: 'wind', tags: [], order: 'given' })))
			.toEqual(['Zephyr', 'Boreas', 'Aeolus', 'North_Wind_Shrine']);
		expect(names(filterFolios({ folios, query: 'honoured', tags: [], order: 'given' }))).toEqual(['North_Wind_Shrine']);
	});

	it('puts the best match first under `relevance`', () => {
		// An exact title beats a snippet mention.
		expect(names(filterFolios({ folios, query: 'boreas', tags: [], order: 'relevance' })))
			.toEqual(['Boreas', 'North_Wind_Shrine']);
	});

	it('applies the query and the tags together, in either order', () => {
		for (const order of ['given', 'relevance'] as const) {
			expect(names(filterFolios({ folios, query: 'boreas', tags: ['place'], order }))).toEqual(['North_Wind_Shrine']);
		}
	});

	it('does not reorder the caller\'s array', () => {
		const input = [...folios];
		filterFolios({ folios: input, query: '', tags: [], order: 'relevance' });
		expect(names(input)).toEqual(names(folios));
	});
});

describe('collectTags', () => {
	it('lists each tag once, alphabetically', () => {
		expect(collectTags(folios)).toEqual(['king', 'major', 'minor', 'place', 'wind']);
	});
});
