import { describe, expect, it } from 'vitest';
import { walkFolioLinks, extractAllLinks } from './folioWalker.js';
import { collectBrokenLinks } from './brokenLinks.js';
import type { ParsedFolio } from './types.js';

function makeFolio(): ParsedFolio {
	return {
		name: 'Alice',
		title: 'Alice',
		type: 'Character',
		folder: 'Characters',
		tags: [],
		sections: {
			Summary: {
				content: 'Friends with [[Characters/Bob]] and [[Characters/Missing]].',
			},
			Allies: {
				value: [
					{ folder: 'Characters', name: 'Bob' },
					{ folder: 'Characters', name: 'Missing' },
				],
			},
			Home: {
				value: { folder: 'Locations', name: 'Athens' },
			},
			Details: {
				fields: {
					parent: { folder: 'Characters', name: 'Missing' },
					children: [{ folder: 'Characters', name: 'Bob' }],
					notes: 'no links here',
				},
			},
		},
	};
}

describe('walkFolioLinks', () => {
	it('visits every link with its section/field location', () => {
		const visited: Array<{ folder: string; name: string; section: string; field?: string }> = [];
		walkFolioLinks(makeFolio(), (link, { section, field }) => {
			visited.push({ folder: link.folder, name: link.name, section, ...(field ? { field } : {}) });
		});

		expect(visited).toEqual([
			{ folder: 'Characters', name: 'Bob', section: 'Summary' },
			{ folder: 'Characters', name: 'Missing', section: 'Summary' },
			{ folder: 'Characters', name: 'Bob', section: 'Allies' },
			{ folder: 'Characters', name: 'Missing', section: 'Allies' },
			{ folder: 'Locations', name: 'Athens', section: 'Home' },
			{ folder: 'Characters', name: 'Missing', section: 'Details', field: 'parent' },
			{ folder: 'Characters', name: 'Bob', section: 'Details', field: 'children' },
		]);
	});
});

describe('extractAllLinks', () => {
	it('returns every outgoing link across content, values, and fields', () => {
		const links = extractAllLinks(makeFolio());
		expect(links).toHaveLength(7);
		expect(links).toContainEqual({ folder: 'Locations', name: 'Athens' });
	});
});

describe('collectBrokenLinks', () => {
	it('reports only links the exists predicate rejects, with location', () => {
		const exists = (folder: string, name: string) => !(folder === 'Characters' && name === 'Missing');
		const broken = collectBrokenLinks(makeFolio(), exists);

		expect(broken).toEqual([
			{ section: 'Summary', folder: 'Characters', name: 'Missing' },
			{ section: 'Allies', folder: 'Characters', name: 'Missing' },
			{ section: 'Details', field: 'parent', folder: 'Characters', name: 'Missing' },
		]);
	});

	it('returns nothing when every link resolves', () => {
		const broken = collectBrokenLinks(makeFolio(), () => true);
		expect(broken).toEqual([]);
	});
});
