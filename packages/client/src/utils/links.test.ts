import { describe, it, expect } from 'vitest';
import type { FolioIndexRecord, ParsedFolio } from '@axiom-forge/shared';
import { isLinkResolved, collectUnresolvedLinks } from './links.js';

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
