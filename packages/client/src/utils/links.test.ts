import { describe, it, expect } from 'vitest';
import type { FolioIndexRecord, ParsedFolio } from '@axiom-forge/shared';
import {
	collectUnresolvedLinks,
	isLinkCandidate,
	isLinkResolved,
	linkKey,
	parseWikiLinkText,
	searchPlaceholder,
	showsFolderColumn,
} from './links.js';

const folios: FolioIndexRecord[] = [
	{ id: 1, type: 'Alpha', folder: 'Alphas', name: 'One',   title: 'One',   tags: [] },
	{ id: 2, type: 'Beta',  folder: 'Betas',  name: 'Aleph', title: 'Aleph', tags: [] },
];

describe('isLinkResolved', () => {
	it('resolves an existing folio', () => {
		expect(isLinkResolved(folios, 'Betas', 'Aleph')).toBe(true);
	});
	it('flags a missing folio', () => {
		expect(isLinkResolved(folios, 'Betas', 'Ghost')).toBe(false);
	});
	it('returns true when the index is still loading (undefined)', () => {
		expect(isLinkResolved(undefined, 'Anything', 'AtAll')).toBe(true);
	});
});

describe('collectUnresolvedLinks', () => {
	function folio(extra: Partial<ParsedFolio> = {}): ParsedFolio {
		return {
			name: 'Sample',
			title: 'Sample',
			type: 'Alpha',
			folder: 'Alphas',
			tags: [],
			sections: {},
			...extra,
		};
	}

	it('returns empty when every link resolves', () => {
		const f = folio({
			sections: {
				Vitals: { fields: { Pal: { folder: 'Betas', name: 'Aleph' } } },
			},
		});
		expect(collectUnresolvedLinks(f, folios)).toEqual([]);
	});

	it('flags a single broken field-level wikilink', () => {
		const f = folio({
			sections: {
				Vitals: { fields: { Pal: { folder: 'Betas', name: 'Ghost' } } },
			},
		});
		expect(collectUnresolvedLinks(f, folios)).toEqual([
			{ section: 'Vitals', field: 'Pal', folder: 'Betas', name: 'Ghost' },
		]);
	});

	it('flags every broken entry in a wikilink-list field', () => {
		const f = folio({
			sections: {
				Vitals: {
					fields: {
						Friends: [
							{ folder: 'Betas', name: 'Aleph' },
							{ folder: 'Betas', name: 'Phantom' },
							{ folder: 'Betas', name: 'Wraith' },
						],
					},
				},
			},
		});
		const result = collectUnresolvedLinks(f, folios);
		expect(result).toEqual([
			{ section: 'Vitals', field: 'Friends', folder: 'Betas', name: 'Phantom' },
			{ section: 'Vitals', field: 'Friends', folder: 'Betas', name: 'Wraith' },
		]);
	});

	it('flags broken targets in a section-level wikilink-list (no field name)', () => {
		const f = folio({
			sections: {
				Allies: {
					value: [
						{ folder: 'Betas', name: 'Aleph' },
						{ folder: 'Betas', name: 'Vanished' },
					],
				},
			},
		});
		expect(collectUnresolvedLinks(f, folios)).toEqual([
			{ section: 'Allies', folder: 'Betas', name: 'Vanished' },
		]);
	});

	it('returns empty when the folio index has not loaded', () => {
		const f = folio({
			sections: {
				Vitals: { fields: { Pal: { folder: 'Betas', name: 'Ghost' } } },
			},
		});
		expect(collectUnresolvedLinks(f, undefined)).toEqual([]);
	});
});

describe('parseWikiLinkText', () => {
	it('splits an explicit Folder/Name', () => {
		expect(parseWikiLinkText('Betas/Aleph')).toEqual({ folder: 'Betas', name: 'Aleph' });
	});

	it('keeps further slashes in the name', () => {
		expect(parseWikiLinkText('Betas/Nested/Deep')).toEqual({ folder: 'Betas', name: 'Nested/Deep' });
	});

	it('takes the folder from a string target for a bare name', () => {
		expect(parseWikiLinkText('Aleph', 'Betas')).toEqual({ folder: 'Betas', name: 'Aleph' });
	});

	it('takes the first folder from a multi-folder target', () => {
		expect(parseWikiLinkText('Aleph', ['Betas', 'Alphas'])).toEqual({ folder: 'Betas', name: 'Aleph' });
	});

	it('falls back to Unsorted with no target, an empty array, or an empty string', () => {
		expect(parseWikiLinkText('Aleph')).toEqual({ folder: 'Unsorted', name: 'Aleph' });
		expect(parseWikiLinkText('Aleph', [])).toEqual({ folder: 'Unsorted', name: 'Aleph' });
		expect(parseWikiLinkText('Aleph', '')).toEqual({ folder: 'Unsorted', name: 'Aleph' });
	});

	it('slugs whitespace in the name but not the folder', () => {
		expect(parseWikiLinkText('Betas/Grey  Wolf')).toEqual({ folder: 'Betas', name: 'Grey_Wolf' });
		expect(parseWikiLinkText('Grey Wolf', 'Betas')).toEqual({ folder: 'Betas', name: 'Grey_Wolf' });
	});

	it('trims surrounding whitespace', () => {
		expect(parseWikiLinkText('  Aleph  ', 'Betas')).toEqual({ folder: 'Betas', name: 'Aleph' });
	});

	it('returns null for empty or whitespace-only text', () => {
		expect(parseWikiLinkText('')).toBeNull();
		expect(parseWikiLinkText('   ')).toBeNull();
	});
});

describe('searchPlaceholder', () => {
	it('names a single target folder', () => {
		expect(searchPlaceholder('Betas')).toBe('Search Betas…');
	});
	it('lists every folder of a multi-folder target', () => {
		expect(searchPlaceholder(['Betas', 'Alphas'])).toBe('Search Betas, Alphas…');
	});
	it('falls back to all folios with no target or an empty one', () => {
		expect(searchPlaceholder()).toBe('Search folios…');
		expect(searchPlaceholder([])).toBe('Search folios…');
		expect(searchPlaceholder('')).toBe('Search folios…');
	});
});

describe('showsFolderColumn', () => {
	it('shows the folder when candidates can span folders', () => {
		expect(showsFolderColumn()).toBe(true);
		expect(showsFolderColumn(['Betas', 'Alphas'])).toBe(true);
	});
	it('hides it when every candidate is in the same folder', () => {
		expect(showsFolderColumn('Betas')).toBe(false);
		expect(showsFolderColumn(['Betas'])).toBe(false);
	});
});

describe('isLinkCandidate', () => {
	const none = new Set<string>();
	const one = folios[0]!;   // Alphas/One
	const aleph = folios[1]!; // Betas/Aleph

	it('accepts anything in scope when there is no target', () => {
		expect(isLinkCandidate(one, undefined, none)).toBe(true);
		expect(isLinkCandidate(aleph, undefined, none)).toBe(true);
	});

	it('honours a string target', () => {
		expect(isLinkCandidate(aleph, 'Betas', none)).toBe(true);
		expect(isLinkCandidate(one, 'Betas', none)).toBe(false);
	});

	it('honours a multi-folder target', () => {
		expect(isLinkCandidate(one, ['Betas', 'Alphas'], none)).toBe(true);
		expect(isLinkCandidate(one, ['Betas'], none)).toBe(false);
	});

	it('excludes anything already selected', () => {
		const selected = new Set([linkKey(aleph.folder, aleph.name)]);
		expect(isLinkCandidate(aleph, 'Betas', selected)).toBe(false);
		expect(isLinkCandidate(one, undefined, selected)).toBe(true);
	});
});

describe('linkKey', () => {
	it('joins folder and name into the id both pickers use', () => {
		expect(linkKey('Betas', 'Aleph')).toBe('Betas/Aleph');
	});
});
