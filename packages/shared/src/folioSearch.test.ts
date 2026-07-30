/**
 * Unit tests for the shared folio ranking (ADR-0011).
 *
 * Pure and in-memory: ranking is a function of an index record and a query
 * string, with no file system or HTTP involved. The tier values are the
 * contract three callers now depend on (server `/api/search`, the Grand Index,
 * and category indexes), so each tier is pinned individually.
 */

import { describe, expect, it } from 'vitest';
import { rankFolios, scoreFolio, type ScorableFolio } from './folioSearch.js';

function folio(overrides: Partial<ScorableFolio> = {}): ScorableFolio {
	return {
		name: 'Alpha_One',
		title: 'Alpha One',
		folder: 'Alphas',
		tags: [],
		...overrides,
	};
}

describe('scoreFolio', () => {
	it('returns 0 for an empty or whitespace-only query', () => {
		expect(scoreFolio(folio(), '')).toBe(0);
		expect(scoreFolio(folio(), '   ')).toBe(0);
	});

	it('returns 0 when nothing matches', () => {
		expect(scoreFolio(folio(), 'nothingatall')).toBe(0);
	});

	it('scores an exact title match highest', () => {
		expect(scoreFolio(folio(), 'Alpha One')).toBe(100);
	});

	it('matches the filename stem with underscores normalised to spaces', () => {
		expect(scoreFolio(folio({ title: 'Something Else' }), 'alpha one')).toBe(100);
	});

	it('scores title prefix above title substring', () => {
		expect(scoreFolio(folio(), 'alpha')).toBe(50);
		expect(scoreFolio(folio(), 'ha on')).toBe(10);
	});

	it('takes only the best title tier, not a sum', () => {
		// 'alpha one' is simultaneously exact, a prefix, and a substring.
		expect(scoreFolio(folio(), 'alpha one')).toBe(100);
	});

	it('scores aliases just below the primary title', () => {
		const aliased = folio({ aliases: ['Phantom'] });
		expect(scoreFolio(aliased, 'phantom')).toBe(80);
		expect(scoreFolio(aliased, 'phant')).toBe(40);
		expect(scoreFolio(aliased, 'hanto')).toBe(8);
	});

	it('scores tags', () => {
		const tagged = folio({ tags: ['hero'] });
		expect(scoreFolio(tagged, 'hero')).toBe(20);
		expect(scoreFolio(tagged, 'her')).toBe(10);
	});

	it('stacks title, alias and tag tiers', () => {
		const rich = folio({ title: 'Hero', name: 'Hero', aliases: ['Hero'], tags: ['hero'] });
		// title exact 100 + alias exact 80 + tag exact 20
		expect(scoreFolio(rich, 'hero')).toBe(200);
	});

	it('scores a folder path match only when nothing else matched', () => {
		expect(scoreFolio(folio(), 'alphas/alpha')).toBe(5);
		// 'alpha' already matches the title as a prefix, so no path bonus is added.
		expect(scoreFolio(folio(), 'alpha')).toBe(50);
	});

	it('adds a snippet match on top of other tiers', () => {
		const withSnippet = folio({ snippet: 'He saw a ghost in Alpha One.' });
		expect(scoreFolio(withSnippet, 'ghost')).toBe(1);
		// Title prefix 50 + snippet 1 — the snippet tier stacks.
		expect(scoreFolio(withSnippet, 'alpha')).toBe(51);
	});

	it('is case-insensitive on both the query and the record', () => {
		expect(scoreFolio(folio({ title: 'ALPHA ONE' }), 'alpha one')).toBe(100);
		expect(scoreFolio(folio(), 'ALPHA ONE')).toBe(100);
	});

	it('tolerates a query with surrounding whitespace', () => {
		expect(scoreFolio(folio(), '  alpha one  ')).toBe(100);
	});
});

describe('rankFolios', () => {
	it('returns an empty array for an empty query', () => {
		expect(rankFolios([folio()], '')).toEqual([]);
	});

	it('drops non-matching records', () => {
		const hit = folio({ name: 'Hit', title: 'Hit' });
		const miss = folio({ name: 'Miss', title: 'Miss' });
		expect(rankFolios([hit, miss], 'hit').map((f) => f.title)).toEqual(['Hit']);
	});

	it('orders by score descending', () => {
		const exact = folio({ name: 'Ghost', title: 'Ghost' });
		const snippetOnly = folio({ name: 'Other', title: 'Other', snippet: 'a ghost passed' });
		const ranked = rankFolios([snippetOnly, exact], 'ghost');
		expect(ranked.map((f) => f.title)).toEqual(['Ghost', 'Other']);
	});

	it('breaks score ties alphabetically by title', () => {
		const zeta = folio({ name: 'Zeta', title: 'Zeta', snippet: 'a ghost' });
		const beta = folio({ name: 'Beta', title: 'Beta', snippet: 'a ghost' });
		expect(rankFolios([zeta, beta], 'ghost').map((f) => f.title)).toEqual(['Beta', 'Zeta']);
	});

	it('ranks an alias hit above a snippet-only hit — the divergence ADR-0011 fixes', () => {
		const aliased = folio({ name: 'Wraith', title: 'Wraith', aliases: ['Phantom'] });
		const mentions = folio({ name: 'Other', title: 'Other', snippet: 'the phantom fled' });
		expect(rankFolios([mentions, aliased], 'phantom').map((f) => f.title)).toEqual([
			'Wraith',
			'Other',
		]);
	});

	it('does not mutate the input collection', () => {
		const input = [folio({ name: 'Zeta', title: 'Zeta' }), folio({ name: 'Beta', title: 'Beta' })];
		const snapshot = input.map((f) => f.title);
		rankFolios(input, 'eta');
		expect(input.map((f) => f.title)).toEqual(snapshot);
	});
});
