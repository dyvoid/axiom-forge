/**
 * Parser round-trip tests against a synthetic in-memory schema.
 *
 * The schema is built here, in code, deliberately covering every FieldType and
 * every layout-role combination. It is *not* fall-of-troy and is *not* Burden
 * of the Guardian — the engine must be schema-agnostic, and these tests prove
 * it on a schema that exists nowhere else.
 */

import { describe, expect, it } from 'vitest';
import { isFieldValueEmpty, parseMarkdown, serializeToMarkdown } from './parser.js';
import type { ProjectSchema } from './schema.js';
import type { ParsedFolio } from './types.js';

// ── Synthetic schema ─────────────────────────────────────────

const synthSchema: ProjectSchema = {
	version: '1.0.0',
	types: {
		Alpha: {
			icon: 'circle',
			folder: 'Alphas',
			sections: {
				Vitals: {
					role: 'meta',
					fields: {
						Label:      { type: 'text' },
						When:       { type: 'date' },
						Mood:       { type: 'select', options: ['Calm', 'Restless', 'Wrathful'] },
						Domains:    { type: 'multiselect', options: ['Sky', 'Sea', 'Earth'] },
						Aliases:    { type: 'text-list' },
						Mentor:     { type: 'wikilink', target: 'Betas' },
						Companions: { type: 'wikilink-list', target: 'Betas' },
					},
				},
				Story:   { role: 'prose', type: 'textarea' },
				Notes:   { type: 'textarea' },
				Friends: { type: 'wikilink-list', target: 'Betas' },
				Bonds: {
					fields: {
						Closest: { type: 'wikilink', target: 'Betas' },
						Rivals:  { type: 'wikilink-list', target: 'Betas' },
					},
				},
			},
		},
		Beta: {
			icon: 'square',
			folder: 'Betas',
			sections: {
				Vitals: {
					role: 'meta',
					fields: { Label: { type: 'text' } },
				},
			},
		},
	},
};

// Helper — pulls a folio through parse→serialize→parse and returns both ends.
function roundTrip(folio: ParsedFolio): { first: ParsedFolio; second: ParsedFolio; markdown: string } {
	const markdown = serializeToMarkdown(folio, synthSchema);
	const reparsed = parseMarkdown(markdown, synthSchema);
	// The parser intentionally leaves `name` empty (filename is owned by the
	// server, not the file content). Overlay it for structural comparison.
	reparsed.name = folio.name;
	return { first: folio, second: reparsed, markdown };
}

// Helper — structural equality ignoring `warnings` (warnings are emitted by parse,
// not preserved in serialized output, so a synthesized folio has none and a
// reparsed folio may have none either — they should match either way).
function expectStructurallyEqual(a: ParsedFolio, b: ParsedFolio): void {
	expect(b.title).toEqual(a.title);
	expect(b.type).toEqual(a.type);
	expect(b.folder).toEqual(a.folder);
	expect(b.tags).toEqual(a.tags);
	expect(b.aliases).toEqual(a.aliases);
	expect(b.sections).toEqual(a.sections);
}

// ── Round-trip stability across field types ──────────────────

describe('parser round-trip — synthetic schema', () => {
	it('round-trips a folio populating every field type', () => {
		const folio: ParsedFolio = {
			name: 'Sample',
			title: 'Sample',
			type: 'Alpha',
			folder: 'Alphas',
			tags: ['one', 'two', 'three'],
			sections: {
				Vitals: {
					fields: {
						Label:      'A short label',
						When:       'Year 42 of the Third Age',
						Mood:       'Restless',
						Domains:    ['Sky', 'Earth'],
						Aliases:    ['The Quiet', 'Sky-walker'],
						Mentor:     { folder: 'Betas', name: 'Old_One' },
						Companions: [
							{ folder: 'Betas', name: 'Friend_A' },
							{ folder: 'Betas', name: 'Friend_B' },
						],
					},
				},
				Story: { content: 'A multi-paragraph story.\n\nWith two paragraphs.' },
				Notes: { content: 'Free notes here.' },
				Friends: {
					value: [
						{ folder: 'Betas', name: 'Pal' },
					],
				},
				Bonds: {
					fields: {
						Closest: { folder: 'Betas', name: 'Closest_One' },
						Rivals: [{ folder: 'Betas', name: 'Rival_A' }],
					},
				},
			},
		};
		const { second } = roundTrip(folio);
		expectStructurallyEqual(folio, second);
	});

	it('preserves a wikilink alias through the round-trip', () => {
		const folio: ParsedFolio = {
			name: 'Aliased',
			title: 'Aliased',
			type: 'Alpha',
			folder: 'Alphas',
			tags: [],
			sections: {
				Vitals: {
					fields: {
						Mentor: { folder: 'Betas', name: 'Old_One', alias: 'the elder' },
					},
				},
			},
		};
		const { second } = roundTrip(folio);
		const mentor = second.sections.Vitals!.fields!.Mentor as { folder: string; name: string; alias?: string };
		expect(mentor).toEqual({ folder: 'Betas', name: 'Old_One', alias: 'the elder' });
	});

	it('round-trips a meta-only folio (no prose section populated)', () => {
		const folio: ParsedFolio = {
			name: 'MetaOnly',
			title: 'MetaOnly',
			type: 'Alpha',
			folder: 'Alphas',
			tags: ['solo'],
			sections: {
				Vitals: { fields: { Label: 'Just a label' } },
			},
		};
		const { second } = roundTrip(folio);
		expectStructurallyEqual(folio, second);
	});

	it('round-trips a prose-only folio (no meta section populated)', () => {
		const folio: ParsedFolio = {
			name: 'ProseOnly',
			title: 'ProseOnly',
			type: 'Alpha',
			folder: 'Alphas',
			tags: [],
			sections: {
				Story: { content: 'Just a story, nothing else.' },
			},
		};
		const { second } = roundTrip(folio);
		expectStructurallyEqual(folio, second);
	});

	it('preserves multi-line prose with inline markdown and h3 subheadings verbatim', () => {
		const proseContent =
			'First paragraph with **bold**, *italic*, and `code` markers.\n\n' +
			'### A subheading\n\n' +
			'Second paragraph after the subheading.';
		const folio: ParsedFolio = {
			name: 'Prose',
			title: 'Prose',
			type: 'Alpha',
			folder: 'Alphas',
			tags: [],
			sections: { Story: { content: proseContent } },
		};
		const { second } = roundTrip(folio);
		expect(second.sections.Story?.content).toBe(proseContent);
	});

	it('preserves unicode and punctuation in the title', () => {
		const folio: ParsedFolio = {
			name: 'Lystarra',
			title: "Lys'tarra — Æther's Echo",
			type: 'Alpha',
			folder: 'Alphas',
			tags: [],
			sections: { Vitals: { fields: { Label: 'x' } } },
		};
		const { second } = roundTrip(folio);
		expect(second.title).toBe("Lys'tarra — Æther's Echo");
	});

	it('is idempotent over a second round-trip', () => {
		const folio: ParsedFolio = {
			name: 'Idem',
			title: 'Idem',
			type: 'Alpha',
			folder: 'Alphas',
			tags: ['a'],
			sections: {
				Vitals: { fields: { Label: 'x', Domains: ['Sky'] } },
				Story:  { content: 'Some prose.' },
			},
		};
		const onceMd = serializeToMarkdown(folio, synthSchema);
		const onceParsed = parseMarkdown(onceMd, synthSchema);
		onceParsed.name = folio.name;
		const twiceMd = serializeToMarkdown(onceParsed, synthSchema);
		expect(twiceMd).toBe(onceMd);
	});
});

// ── Empty-field omission ─────────────────────────────────────

describe('parser — empty-field omission', () => {
	it('omits empty fields entirely (no placeholder dashes)', () => {
		const folio: ParsedFolio = {
			name: 'Empty',
			title: 'Empty',
			type: 'Alpha',
			folder: 'Alphas',
			tags: ['only-one'],
			sections: {
				Vitals: {
					fields: {
						Label:   'set',
						When:    null,
						Mood:    null,
						Domains: [],
						Aliases: [],
						Mentor:  null,
					},
				},
			},
		};
		const markdown = serializeToMarkdown(folio, synthSchema);
		expect(markdown).not.toMatch(/\*\*When:\*\*/);
		expect(markdown).not.toMatch(/\*\*Mood:\*\*/);
		expect(markdown).not.toMatch(/\*\*Domains:\*\*/);
		expect(markdown).not.toMatch(/\*\*Aliases:\*\*/);
		expect(markdown).not.toMatch(/\*\*Mentor:\*\*/);
		expect(markdown).toMatch(/\*\*Label:\*\* set/);
	});

	it('omits the tags frontmatter key entirely when tags array is empty', () => {
		const folio: ParsedFolio = {
			name: 'NoTags',
			title: 'NoTags',
			type: 'Alpha',
			folder: 'Alphas',
			tags: [],
			sections: { Vitals: { fields: { Label: 'x' } } },
		};
		const markdown = serializeToMarkdown(folio, synthSchema);
		// No `tags:` key appears in the frontmatter when there are none.
		expect(markdown).not.toMatch(/^tags:/m);
	});

	it('omits the aliases frontmatter key entirely when there are none', () => {
		const folio: ParsedFolio = {
			name: 'NoAliases',
			title: 'NoAliases',
			type: 'Alpha',
			folder: 'Alphas',
			tags: ['t'],
			sections: { Vitals: { fields: { Label: 'x' } } },
		};
		const markdown = serializeToMarkdown(folio, synthSchema);
		expect(markdown).not.toMatch(/^aliases:/m);
	});

	it('omits a section that has all-empty fields', () => {
		const folio: ParsedFolio = {
			name: 'NoBonds',
			title: 'NoBonds',
			type: 'Alpha',
			folder: 'Alphas',
			tags: [],
			sections: {
				Vitals: { fields: { Label: 'x' } },
				Bonds:  { fields: { Closest: null, Rivals: [] } },
			},
		};
		const markdown = serializeToMarkdown(folio, synthSchema);
		expect(markdown).not.toContain('## Bonds');
	});

	it('omits a textarea section with empty content', () => {
		const folio: ParsedFolio = {
			name: 'NoStory',
			title: 'NoStory',
			type: 'Alpha',
			folder: 'Alphas',
			tags: [],
			sections: {
				Vitals: { fields: { Label: 'x' } },
				Story:  { content: '' },
			},
		};
		const markdown = serializeToMarkdown(folio, synthSchema);
		expect(markdown).not.toContain('## Story');
	});
});

// ── YAML frontmatter ─────────────────────────────────────────

describe('parser — YAML frontmatter', () => {
	it('emits metadata as a leading YAML frontmatter block, not a Meta section', () => {
		const folio: ParsedFolio = {
			name: 'Fronted',
			title: 'Fronted',
			type: 'Alpha',
			folder: 'Alphas',
			tags: ['x', 'y'],
			aliases: ['Other Name'],
			sections: { Vitals: { fields: { Label: 'set' } } },
		};
		const markdown = serializeToMarkdown(folio, synthSchema);
		// Document opens with a frontmatter fence containing the metadata keys.
		expect(markdown.startsWith('---\n')).toBe(true);
		expect(markdown).toMatch(/^type: Alpha$/m);
		expect(markdown).toMatch(/^tags:$/m);
		expect(markdown).toMatch(/^aliases:$/m);
		// The H1 follows the closing fence; the old "## Meta" section is gone.
		expect(markdown).not.toContain('## Meta');
		expect(markdown).toMatch(/---\n\n# Fronted/);
	});

	it('round-trips aliases through parse → serialize → parse', () => {
		const folio: ParsedFolio = {
			name: 'Aka',
			title: 'Aka',
			type: 'Alpha',
			folder: 'Alphas',
			tags: [],
			aliases: ['The First', 'The Last'],
			sections: { Vitals: { fields: { Label: 'x' } } },
		};
		const { second } = roundTrip(folio);
		expect(second.aliases).toEqual(['The First', 'The Last']);
	});

	it('parses tags and aliases authored as YAML block lists', () => {
		const raw = [
			'---',
			'type: Alpha',
			'tags:',
			'  - greek',
			'  - hero',
			'aliases:',
			'  - Pelides',
			'---',
			'',
			'# Achilles',
			'',
			'## Vitals',
			'- **Label:** x',
			'',
		].join('\n');
		const parsed = parseMarkdown(raw, synthSchema);
		expect(parsed.type).toBe('Alpha');
		expect(parsed.tags).toEqual(['greek', 'hero']);
		expect(parsed.aliases).toEqual(['Pelides']);
		expect(parsed.title).toBe('Achilles');
	});

	it('quotes values containing YAML-special characters and reads them back', () => {
		const folio: ParsedFolio = {
			name: 'Special',
			title: 'Special',
			type: 'Alpha',
			folder: 'Alphas',
			tags: [],
			aliases: ['Lys: the elder'],
			sections: { Vitals: { fields: { Label: 'x' } } },
		};
		const { second, markdown } = roundTrip(folio);
		expect(markdown).toContain("'Lys: the elder'");
		expect(second.aliases).toEqual(['Lys: the elder']);
	});

	it('leaves aliases undefined when the frontmatter has none', () => {
		const raw = [
			'---',
			'type: Alpha',
			'---',
			'',
			'# Plain',
			'',
		].join('\n');
		const parsed = parseMarkdown(raw, synthSchema);
		expect(parsed.aliases).toBeUndefined();
	});

	it('throws on malformed YAML frontmatter (syntax error)', () => {
		// Unclosed bracket — invalid YAML. The parser must throw, not silently
		// degrade: a broken file should be surfaced, not hidden behind an empty type.
		const raw = [
			'---',
			'type: [unclosed',
			'---',
			'',
			'# Broken',
			'',
		].join('\n');
		expect(() => parseMarkdown(raw, synthSchema)).toThrow();
	});

	it('warns when frontmatter is valid YAML but not a mapping', () => {
		// A bare YAML list is syntactically valid but semantically wrong —
		// frontmatter must be key: value pairs. Surface as a warning, not a throw.
		const raw = [
			'---',
			'- just',
			'- a',
			'- list',
			'---',
			'',
			'# Weird',
			'',
		].join('\n');
		const parsed = parseMarkdown(raw, synthSchema);
		expect(parsed.type).toBe('');
		expect(parsed.warnings ?? []).toEqual(
			expect.arrayContaining([expect.stringContaining('not a mapping')]),
		);
	});
});

// ── Schema warnings ──────────────────────────────────────────

describe('parser — schema warnings', () => {
	it('emits a warning for an unknown section', () => {
		const raw = [
			'---',
			'type: Alpha',
			'---',
			'',
			'# Mystery',
			'',
			'## Mystery Section',
			'- **X:** y',
			'',
		].join('\n');
		const parsed = parseMarkdown(raw, synthSchema);
		expect(parsed.warnings ?? []).toEqual(
			expect.arrayContaining([expect.stringContaining('Unknown section')]),
		);
	});

	it('emits a warning for an unknown field inside a known section', () => {
		const raw = [
			'---',
			'type: Alpha',
			'---',
			'',
			'# X',
			'',
			'## Vitals',
			'- **Label:** ok',
			'- **NotAField:** bad',
			'',
		].join('\n');
		const parsed = parseMarkdown(raw, synthSchema);
		expect(parsed.warnings ?? []).toEqual(
			expect.arrayContaining([expect.stringContaining('Unknown field "NotAField"')]),
		);
	});

	it('emits a warning for an invalid select value', () => {
		const raw = [
			'---',
			'type: Alpha',
			'---',
			'',
			'# X',
			'',
			'## Vitals',
			'- **Mood:** Joyful',
			'',
		].join('\n');
		const parsed = parseMarkdown(raw, synthSchema);
		expect(parsed.warnings ?? []).toEqual(
			expect.arrayContaining([expect.stringContaining('Invalid value "Joyful"')]),
		);
	});

	it('emits a warning for an unknown type', () => {
		const raw = [
			'---',
			'type: NotATypeAtAll',
			'---',
			'',
			'# X',
			'',
		].join('\n');
		const parsed = parseMarkdown(raw, synthSchema);
		expect(parsed.warnings ?? []).toEqual(
			expect.arrayContaining([expect.stringContaining('Unknown type')]),
		);
	});
});

// The predicate the serializer and the read view now share. Pinned directly so
// that a change to what counts as empty has to be a deliberate edit to these
// cases, rather than a silent divergence between what is written to disk and
// what is rendered. See ADR-0021.
describe('isFieldValueEmpty', () => {
	it('treats null, undefined, empty string and empty array as empty', () => {
		expect(isFieldValueEmpty(null)).toBe(true);
		expect(isFieldValueEmpty(undefined)).toBe(true);
		expect(isFieldValueEmpty('')).toBe(true);
		expect(isFieldValueEmpty([])).toBe(true);
	});

	it('treats any populated value as non-empty', () => {
		expect(isFieldValueEmpty('x')).toBe(false);
		expect(isFieldValueEmpty(['x'])).toBe(false);
		expect(isFieldValueEmpty({ folder: 'Alphas', name: 'Arion' })).toBe(false);
		expect(isFieldValueEmpty([{ folder: 'Alphas', name: 'Arion' }])).toBe(false);
	});

	it('does not treat whitespace or falsy-but-present values as empty', () => {
		// Whitespace is content as far as the serializer is concerned; the read
		// view must agree, which is the whole point of sharing this predicate.
		expect(isFieldValueEmpty(' ')).toBe(false);
		expect(isFieldValueEmpty('0')).toBe(false);
	});
});
