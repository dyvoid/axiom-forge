/**
 * @vitest-environment jsdom
 *
 * The controls under test are the ones the UI consistency audit consolidated:
 * every multi-value field in the app renders through ChipField, so a
 * regression here breaks tags, multiselect, wikilink lists and the tag filter
 * at once. These cover the behaviour that pure helpers can't -- open/close,
 * the commit gestures, keyboard nav and the ARIA wiring.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChipField, type ChipOption } from './ChipField.js';

afterEach(cleanup);

const options: ChipOption[] = [
	{ id: 'odysseus', label: 'Odysseus', meta: 'Humans', search: 'Ulysses' },
	{ id: 'achilles', label: 'Achilles', meta: 'Humans' },
	{ id: 'athena', label: 'Athena', meta: 'Gods' },
];

function setup(props: Partial<React.ComponentProps<typeof ChipField>> = {}) {
	const onAdd = vi.fn();
	const onRemove = vi.fn();
	const utils = render(
		<ChipField
			chips={[]}
			options={options}
			onAdd={onAdd}
			onRemove={onRemove}
			ariaLabel="Allies"
			{...props}
		/>,
	);
	return { onAdd, onRemove, user: userEvent.setup(), ...utils };
}

function input(): HTMLElement {
	return screen.getByRole('combobox', { name: 'Allies' });
}

describe('ChipField menu', () => {
	it('stays closed until the field is touched', () => {
		setup();
		expect(screen.queryByRole('listbox')).toBeNull();
		expect(input()).toHaveAttribute('aria-expanded', 'false');
	});

	it('opens on click and lists every option', async () => {
		const { user } = setup();
		await user.click(input());
		expect(input()).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
			'OdysseusHumans',
			'AchillesHumans',
			'AthenaGods',
		]);
	});

	/*
	 * The bug the audit records: after committing a chip the input keeps focus,
	 * so a second click fires no `focus` event. Reopening was wired only to
	 * onFocus, and the field looked dead. Two handlers reopen it now (the box
	 * and the input); this pins the behaviour, not either one of them.
	 */
	it('reopens on a click when the input already has focus', async () => {
		const { user } = setup({ onAddRaw: vi.fn() });
		await user.click(input());
		await user.click(screen.getAllByRole('option')[0]!);
		expect(screen.queryByRole('listbox')).toBeNull();
		expect(input()).toHaveFocus();

		await user.click(input());
		expect(screen.getByRole('listbox')).toBeInTheDocument();
	});

	it('closes on Escape without committing', async () => {
		const { user, onAdd } = setup();
		await user.click(input());
		await user.keyboard('{Escape}');
		expect(screen.queryByRole('listbox')).toBeNull();
		expect(onAdd).not.toHaveBeenCalled();
	});
});

describe('ChipField filtering', () => {
	it('narrows the menu to matching options', async () => {
		const { user } = setup();
		await user.click(input());
		await user.type(input(), 'ach');
		expect(screen.getAllByRole('option')).toHaveLength(1);
		expect(screen.getByRole('option')).toHaveTextContent('Achilles');
	});

	/*
	 * The alias regression, as a test. ChipField once hand-rolled substring
	 * matching instead of taking a `score` prop, so typing an alias found
	 * nothing and offered to create a broken link to a folio that already
	 * existed. Callers now pass `scoreFolio`; this stands in for it.
	 */
	it('ranks through the supplied score function, not a substring match', async () => {
		const score = (option: ChipOption, query: string): number =>
			`${option.label} ${option.search ?? ''}`.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
		const { user } = setup({ score });
		await user.click(input());
		await user.type(input(), 'Ulysses');
		expect(screen.getByRole('option')).toHaveTextContent('Odysseus');
	});

	it('offers to commit typed text when the vocabulary is open', async () => {
		const { user } = setup({ onAddRaw: vi.fn() });
		await user.click(input());
		await user.type(input(), 'Nobody');
		expect(screen.queryAllByRole('option')).toHaveLength(0);
		expect(screen.getByRole('listbox')).toHaveTextContent('Press ↵ to add “Nobody”');
	});

	it('says there are no matches when the vocabulary is closed', async () => {
		const { user } = setup();
		await user.click(input());
		await user.type(input(), 'Nobody');
		expect(screen.getByRole('listbox')).toHaveTextContent('No matches');
	});
});

describe('ChipField commit', () => {
	/*
	 * Note what this does NOT prove. The control commits on
	 * mousedown+preventDefault rather than click, so focus never leaves the
	 * input and the menu can't be torn down by a blur mid-commit. jsdom fires
	 * both events with no real focus ordering behind them, so swapping the
	 * handler back to onClick keeps this test green -- verified by mutation.
	 * The gesture itself has to be checked in a browser; what's pinned here is
	 * that a pointer interaction commits and leaves the field ready to type.
	 */
	it('commits the clicked option and keeps focus in the input', async () => {
		const { user, onAdd } = setup();
		await user.click(input());
		await user.click(screen.getByRole('option', { name: /Athena/ }));
		expect(onAdd).toHaveBeenCalledWith(options[2]);
		expect(input()).toHaveFocus();
		expect(input()).toHaveValue('');
	});

	it('commits the highlighted option with Enter after arrowing down', async () => {
		const { user, onAdd } = setup();
		await user.click(input());
		await user.keyboard('{ArrowDown}{Enter}');
		expect(onAdd).toHaveBeenCalledWith(options[1]);
	});

	it('does not run past the ends of the list', async () => {
		const { user, onAdd } = setup();
		await user.click(input());
		await user.keyboard('{ArrowUp}{ArrowUp}{Enter}');
		expect(onAdd).toHaveBeenCalledWith(options[0]);

		onAdd.mockClear();
		await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{Enter}');
		expect(onAdd).toHaveBeenCalledWith(options[2]);
	});

	it('commits typed text on Enter when nothing matches and the vocabulary is open', async () => {
		const onAddRaw = vi.fn();
		const { user, onAdd } = setup({ onAddRaw });
		await user.click(input());
		await user.type(input(), 'Nobody{Enter}');
		expect(onAddRaw).toHaveBeenCalledWith('Nobody');
		expect(onAdd).not.toHaveBeenCalled();
	});

	it('commits nothing on Enter when the vocabulary is closed', async () => {
		const { user, onAdd } = setup();
		await user.click(input());
		await user.type(input(), 'Nobody{Enter}');
		expect(onAdd).not.toHaveBeenCalled();
	});

	it('treats a comma as Enter', async () => {
		const onAddRaw = vi.fn();
		const { user } = setup({ onAddRaw });
		await user.click(input());
		await user.type(input(), 'Nobody,');
		expect(onAddRaw).toHaveBeenCalledWith('Nobody');
	});
});

describe('ChipField chips', () => {
	const chips: ChipOption[] = [{ id: 'ajax', label: 'Ajax' }, { id: 'hector', label: 'Hector' }];

	it('removes a chip from its own button', async () => {
		const { user, onRemove } = setup({ chips });
		await user.click(screen.getByRole('button', { name: 'Remove Hector' }));
		expect(onRemove).toHaveBeenCalledWith('hector');
	});

	it('removes the last chip on Backspace in an empty input', async () => {
		const { user, onRemove } = setup({ chips });
		await user.click(input());
		await user.keyboard('{Backspace}');
		expect(onRemove).toHaveBeenCalledWith('hector');
	});

	it('leaves chips alone when Backspace is editing typed text', async () => {
		const { user, onRemove } = setup({ chips });
		await user.click(input());
		await user.type(input(), 'a{Backspace}');
		expect(onRemove).not.toHaveBeenCalled();
	});

	it('offers clear-all only when there are chips and a handler', async () => {
		const onClearAll = vi.fn();
		const { user } = setup({ chips, onClearAll });
		await user.click(screen.getByRole('button', { name: 'Clear all' }));
		expect(onClearAll).toHaveBeenCalled();

		cleanup();
		setup({ chips: [], onClearAll });
		expect(screen.queryByRole('button', { name: 'Clear all' })).toBeNull();
	});
});

describe('ChipField accessibility', () => {
	it('points the combobox at its listbox and the highlighted option', async () => {
		const { user } = setup();
		await user.click(input());

		const listbox = screen.getByRole('listbox');
		expect(input()).toHaveAttribute('aria-controls', listbox.id);

		const active = input().getAttribute('aria-activedescendant');
		expect(within(listbox).getByRole('option', { name: /Odysseus/ })).toHaveAttribute('id', active);

		await user.keyboard('{ArrowDown}');
		expect(within(listbox).getByRole('option', { name: /Achilles/ })).toHaveAttribute(
			'id',
			input().getAttribute('aria-activedescendant'),
		);
	});

	it('drops aria-activedescendant when the menu is closed', () => {
		setup();
		expect(input()).not.toHaveAttribute('aria-activedescendant');
	});
});
