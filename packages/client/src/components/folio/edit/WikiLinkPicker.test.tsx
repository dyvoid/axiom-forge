/**
 * @vitest-environment jsdom
 *
 * The single-value wikilink control. The audit aligned it with ChipField on
 * the commit gesture and the ARIA wiring, and split the placeholder apart
 * from the accessible name; these pin that down.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WikiLinkPicker } from './WikiLinkPicker.js';
import { renderWithProject } from '../../../test/renderWithProject.js';

afterEach(cleanup);

function setup(props: Partial<React.ComponentProps<typeof WikiLinkPicker>> = {}) {
	const onChange = vi.fn();
	renderWithProject(<WikiLinkPicker value={null} onChange={onChange} {...props} />);
	return { onChange, user: userEvent.setup() };
}

describe('WikiLinkPicker naming', () => {
	/*
	 * WikilinkField used to pass the field's accessible name in as the
	 * *placeholder*, so a "Location" field prompted with "Location" rather
	 * than saying what it searched. The two are separate props now.
	 */
	it('names the target folder in the placeholder', () => {
		setup({ target: 'Locations' });
		expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Search Locations…');
	});

	it('lists every folder of a multi-folder target', () => {
		setup({ target: ['Humans', 'Gods'] });
		expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Search Humans, Gods…');
	});

	it('falls back to all folios when the field has no target', () => {
		setup();
		expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Search folios…');
	});

	it('takes its accessible name from ariaLabel, not the placeholder', () => {
		setup({ target: 'Locations', ariaLabel: 'Location' });
		expect(screen.getByRole('combobox', { name: 'Location' })).toHaveAttribute(
			'placeholder',
			'Search Locations…',
		);
	});
});

describe('WikiLinkPicker candidates', () => {
	it('offers only folios in the target folder', async () => {
		const { user } = setup({ target: 'Gods' });
		await user.click(screen.getByRole('combobox'));
		expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Athena']);
	});

	it('offers every folio when there is no target', async () => {
		const { user } = setup();
		await user.click(screen.getByRole('combobox'));
		expect(screen.getAllByRole('option')).toHaveLength(4);
	});

	it('shows the folder column only when candidates can span folders', async () => {
		const { user } = setup();
		await user.click(screen.getByRole('combobox'));
		expect(screen.getByRole('option', { name: /Athena/ })).toHaveTextContent('Gods');

		cleanup();
		const second = setup({ target: 'Gods' });
		await second.user.click(screen.getByRole('combobox'));
		expect(screen.getByRole('option', { name: /Athena/ })).not.toHaveTextContent('Gods');
	});

	/*
	 * ADR-0011: ranking goes through the shared scorer, so an alias finds its
	 * folio. A substring match over titles does not, and shipping one is how
	 * "Ulysses" came back empty while Odysseus sat in the index.
	 */
	it('finds a folio by its alias', async () => {
		const { user } = setup({ target: 'Humans' });
		await user.click(screen.getByRole('combobox'));
		await user.type(screen.getByRole('combobox'), 'Ulysses');
		expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Odysseus']);
	});

	it('excludes the folio already selected', async () => {
		const { user } = setup({ target: 'Humans', value: { folder: 'Humans', name: 'Achilles' } });
		await user.click(screen.getByText('Achilles'));
		expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Odysseus']);
	});
});

describe('WikiLinkPicker commit', () => {
	/* As in ChipField's tests: jsdom can't tell the mousedown+preventDefault
	   commit apart from an onClick one, so this pins that a pointer
	   interaction commits, not which event carries it. */
	it('commits the clicked option', async () => {
		const { user, onChange } = setup({ target: 'Locations' });
		await user.click(screen.getByRole('combobox'));
		await user.click(screen.getByRole('option', { name: /Troy/ }));
		expect(onChange).toHaveBeenCalledWith({ folder: 'Locations', name: 'Troy' });
	});

	it('commits the highlighted option with Enter', async () => {
		const { user, onChange } = setup({ target: 'Humans' });
		await user.click(screen.getByRole('combobox'));
		await user.keyboard('{ArrowDown}{Enter}');
		expect(onChange).toHaveBeenCalledWith({ folder: 'Humans', name: 'Achilles' });
	});

	/* Typed text that matches nothing still commits, as a link to a folio
	   that doesn't exist yet — the target folder supplies the folder and
	   spaces become underscores. */
	it('commits typed text as a new link in the target folder', async () => {
		const { user, onChange } = setup({ target: 'Humans' });
		await user.click(screen.getByRole('combobox'));
		await user.type(screen.getByRole('combobox'), 'Grey Wolf{Enter}');
		expect(onChange).toHaveBeenCalledWith({ folder: 'Humans', name: 'Grey_Wolf' });
	});

	it('clears the selection', async () => {
		const { user, onChange } = setup({
			target: 'Humans',
			value: { folder: 'Humans', name: 'Achilles' },
		});
		await user.click(screen.getByRole('button', { name: 'Clear selection' }));
		expect(onChange).toHaveBeenCalledWith(null);
	});

	it('commits nothing on Escape', async () => {
		const { user, onChange } = setup({ target: 'Humans' });
		await user.click(screen.getByRole('combobox'));
		await user.keyboard('{Escape}');
		expect(screen.queryByRole('listbox')).toBeNull();
		expect(onChange).not.toHaveBeenCalled();
	});
});

describe('WikiLinkPicker accessibility', () => {
	it('points the combobox at its listbox and the highlighted option', async () => {
		const { user } = setup({ target: 'Humans' });
		const combobox = screen.getByRole('combobox');
		await user.click(combobox);

		const listbox = screen.getByRole('listbox');
		expect(combobox).toHaveAttribute('aria-controls', listbox.id);
		expect(within(listbox).getByRole('option', { name: /Odysseus/ })).toHaveAttribute(
			'id',
			combobox.getAttribute('aria-activedescendant'),
		);

		await user.keyboard('{ArrowDown}');
		expect(within(listbox).getByRole('option', { name: /Achilles/ })).toHaveAttribute(
			'id',
			combobox.getAttribute('aria-activedescendant'),
		);
	});
});
