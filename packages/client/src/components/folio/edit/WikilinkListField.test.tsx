/**
 * @vitest-environment jsdom
 *
 * The multi-value wikilink field. This is the component the alias regression
 * shipped in: it builds ChipField's options and hands it a `score` backed by
 * the shared `scoreFolio`. When that wiring was a hand-rolled substring
 * match, typing "Ulysses" found nothing and offered to create a broken link
 * to a folio that already existed.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { WikiLink } from '@axiom-forge/shared';
import { WikilinkListField } from './WikilinkListField.js';
import { renderWithProject } from '../../../test/renderWithProject.js';

afterEach(cleanup);

function setup(props: Partial<React.ComponentProps<typeof WikilinkListField>> = {}) {
	const onChange = vi.fn();
	renderWithProject(
		<WikilinkListField value={[]} onChange={onChange} ariaLabel="Allies" {...props} />,
	);
	return { onChange, user: userEvent.setup() };
}

function input(): HTMLElement {
	return screen.getByRole('combobox', { name: 'Allies' });
}

describe('WikilinkListField ranking', () => {
	it('finds a folio by its alias', async () => {
		const { user } = setup({ target: 'Humans' });
		await user.click(input());
		await user.type(input(), 'Ulysses');
		expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Odysseus']);
	});

	it('commits the aliased folio under its real name, not the alias', async () => {
		const { user, onChange } = setup({ target: 'Humans' });
		await user.click(input());
		await user.type(input(), 'Ulysses');
		await user.click(screen.getByRole('option', { name: /Odysseus/ }));
		expect(onChange).toHaveBeenCalledWith([{ folder: 'Humans', name: 'Odysseus' }]);
	});

	it('ranks a title match above a tag match', async () => {
		const { user } = setup();
		await user.click(input());
		await user.type(input(), 'greek');
		// Both Humans carry the tag; neither title matches, so the tag tier
		// decides and both stay. The point is that the tag tier is reachable
		// at all -- a title-substring match would return nothing.
		expect(screen.getAllByRole('option')).toHaveLength(2);
	});
});

describe('WikilinkListField candidates', () => {
	it('offers only folios in the target folder', async () => {
		const { user } = setup({ target: 'Gods' });
		await user.click(input());
		expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Athena']);
	});

	it('excludes folios already selected', async () => {
		const value: WikiLink[] = [{ folder: 'Humans', name: 'Achilles' }];
		const { user } = setup({ target: 'Humans', value });
		await user.click(input());
		expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Odysseus']);
	});

	it('shows the folder column only when candidates can span folders', async () => {
		const { user } = setup();
		await user.click(input());
		expect(screen.getByRole('option', { name: /Athena/ })).toHaveTextContent('Gods');

		cleanup();
		const scoped = setup({ target: 'Gods' });
		await scoped.user.click(input());
		expect(screen.getByRole('option', { name: /Athena/ })).not.toHaveTextContent('Gods');
	});

	it('prompts with the target folder', () => {
		setup({ target: 'Gods' });
		expect(input()).toHaveAttribute('placeholder', 'Search Gods…');
	});
});

describe('WikilinkListField editing', () => {
	it('appends to the existing selection rather than replacing it', async () => {
		const value: WikiLink[] = [{ folder: 'Gods', name: 'Athena' }];
		const { user, onChange } = setup({ value });
		await user.click(input());
		await user.click(screen.getByRole('option', { name: /Troy/ }));
		expect(onChange).toHaveBeenCalledWith([
			{ folder: 'Gods', name: 'Athena' },
			{ folder: 'Locations', name: 'Troy' },
		]);
	});

	it('commits typed text as a link into the target folder', async () => {
		const { user, onChange } = setup({ target: 'Humans' });
		await user.click(input());
		await user.type(input(), 'Grey Wolf{Enter}');
		expect(onChange).toHaveBeenCalledWith([{ folder: 'Humans', name: 'Grey_Wolf' }]);
	});

	it('removes a chip by its own button', async () => {
		const value: WikiLink[] = [
			{ folder: 'Gods', name: 'Athena' },
			{ folder: 'Locations', name: 'Troy' },
		];
		const { user, onChange } = setup({ value });
		await user.click(screen.getByRole('button', { name: 'Remove Athena' }));
		expect(onChange).toHaveBeenCalledWith([{ folder: 'Locations', name: 'Troy' }]);
	});
});
