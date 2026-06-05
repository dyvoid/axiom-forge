import { describe, expect, it } from 'vitest';
import { rewriteWikiLinks } from './wikilinkRewrite.js';

describe('rewriteWikiLinks', () => {
	it('renames a single matching wiki-link', () => {
		const md = 'See [[Foo/Bar]] for more.';
		const { content, rewrites } = rewriteWikiLinks(md, { folder: 'Foo', name: 'Bar' }, { name: 'Baz' });
		expect(content).toBe('See [[Foo/Baz]] for more.');
		expect(rewrites).toBe(1);
	});

	it('preserves an alias when rewriting', () => {
		const md = 'See [[Foo/Bar|the thing]] inline.';
		const { content, rewrites } = rewriteWikiLinks(md, { folder: 'Foo', name: 'Bar' }, { name: 'Baz' });
		expect(content).toBe('See [[Foo/Baz|the thing]] inline.');
		expect(rewrites).toBe(1);
	});

	it('rewrites multiple occurrences across the same document', () => {
		const md = 'A [[Foo/Bar]], then [[Foo/Bar|alias]], and a third [[Foo/Bar]].';
		const { content, rewrites } = rewriteWikiLinks(md, { folder: 'Foo', name: 'Bar' }, { name: 'Quux' });
		expect(content).toBe('A [[Foo/Quux]], then [[Foo/Quux|alias]], and a third [[Foo/Quux]].');
		expect(rewrites).toBe(3);
	});

	it('leaves links to a different name in the same folder untouched', () => {
		const md = '[[Foo/Bar]] and [[Foo/Other]] and [[Foo/Barbaric]]';
		const { content, rewrites } = rewriteWikiLinks(md, { folder: 'Foo', name: 'Bar' }, { name: 'Baz' });
		expect(content).toBe('[[Foo/Baz]] and [[Foo/Other]] and [[Foo/Barbaric]]');
		expect(rewrites).toBe(1);
	});

	it('leaves links with the same name in a different folder untouched', () => {
		const md = '[[Foo/Bar]] and [[Qux/Bar]]';
		const { content, rewrites } = rewriteWikiLinks(md, { folder: 'Foo', name: 'Bar' }, { name: 'Baz' });
		expect(content).toBe('[[Foo/Baz]] and [[Qux/Bar]]');
		expect(rewrites).toBe(1);
	});

	it('is case-sensitive on folder and name (matches parser behaviour)', () => {
		const md = '[[Foo/Bar]] and [[foo/Bar]] and [[Foo/bar]]';
		const { content, rewrites } = rewriteWikiLinks(md, { folder: 'Foo', name: 'Bar' }, { name: 'Baz' });
		expect(content).toBe('[[Foo/Baz]] and [[foo/Bar]] and [[Foo/bar]]');
		expect(rewrites).toBe(1);
	});

	it('returns rewrites: 0 and unchanged content when there are no matches', () => {
		const md = 'No wiki-links to Bar here, just [[Foo/Other]].';
		const { content, rewrites } = rewriteWikiLinks(md, { folder: 'Foo', name: 'Bar' }, { name: 'Baz' });
		expect(content).toBe(md);
		expect(rewrites).toBe(0);
	});

	it('is idempotent on a second pass', () => {
		const md = 'See [[Foo/Bar]] and [[Foo/Bar|alias]].';
		const first  = rewriteWikiLinks(md,         { folder: 'Foo', name: 'Bar' }, { name: 'Baz' });
		const second = rewriteWikiLinks(first.content, { folder: 'Foo', name: 'Bar' }, { name: 'Baz' });
		expect(second.content).toBe(first.content);
		expect(second.rewrites).toBe(0);
	});

	it('handles names with regex metacharacters safely', () => {
		const md = 'Path [[Folder/Name.With.Dots]] and [[Folder/Name+Plus]]';
		const { content, rewrites } = rewriteWikiLinks(
			md,
			{ folder: 'Folder', name: 'Name.With.Dots' },
			{ name: 'Renamed' },
		);
		expect(content).toBe('Path [[Folder/Renamed]] and [[Folder/Name+Plus]]');
		expect(rewrites).toBe(1);
	});
});

describe('rewriteWikiLinks — code fence awareness', () => {
	it('does not rewrite a wikilink inside a plain fenced code block', () => {
		const md = '```\nSee [[Foo/Bar]] for syntax.\n```';
		const { content, rewrites } = rewriteWikiLinks(md, { folder: 'Foo', name: 'Bar' }, { name: 'Baz' });
		expect(content).toBe(md);
		expect(rewrites).toBe(0);
	});

	it('does not rewrite a wikilink inside a language-tagged fence', () => {
		const md = '```md\nExample: [[Foo/Bar]]\n```';
		const { content, rewrites } = rewriteWikiLinks(md, { folder: 'Foo', name: 'Bar' }, { name: 'Baz' });
		expect(content).toBe(md);
		expect(rewrites).toBe(0);
	});

	it('rewrites a link outside a fence but leaves one inside untouched', () => {
		const md = [
			'Normal prose: [[Foo/Bar]].',
			'',
			'```',
			'Example: [[Foo/Bar]]',
			'```',
			'',
			'After the fence: [[Foo/Bar]].',
		].join('\n');
		const { content, rewrites } = rewriteWikiLinks(md, { folder: 'Foo', name: 'Bar' }, { name: 'Baz' });
		expect(rewrites).toBe(2);
		expect(content).toContain('Normal prose: [[Foo/Baz]].');
		expect(content).toContain('Example: [[Foo/Bar]]');
		expect(content).toContain('After the fence: [[Foo/Baz]].');
	});
});
