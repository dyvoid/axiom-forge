/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog.js';

afterEach(cleanup);

/*
 * jsdom implements no layout, so `offsetParent` is always null and the focus
 * trap would see every button as hidden. Report each element as laid out so
 * the trap's own logic is what these tests exercise.
 */
const offsetParent = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent')!;
beforeAll(() => {
	Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
		configurable: true,
		get(this: HTMLElement) { return this.parentNode; },
	});
});
afterAll(() => {
	Object.defineProperty(HTMLElement.prototype, 'offsetParent', offsetParent);
});

function dialog(open: boolean, onCancel: () => void): JSX.Element {
	return (
		<>
			<button type="button">Outside</button>
			<ConfirmDialog
				open={open}
				title="Delete folio"
				message="Sure?"
				confirmLabel="Delete"
				onConfirm={() => undefined}
				onCancel={onCancel}
			/>
		</>
	);
}

describe('ConfirmDialog', () => {
	it('keeps focus where the user moved it when the parent re-renders', async () => {
		const user = userEvent.setup();
		const { rerender } = render(dialog(true, () => undefined));
		expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

		await user.tab();
		expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();

		// A parent re-render hands the dialog a fresh inline onCancel.
		rerender(dialog(true, () => undefined));
		expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
	});

	it('cancels on Escape with the latest handler, and returns focus on close', async () => {
		const user = userEvent.setup();
		const first = vi.fn();
		const latest = vi.fn();
		const { rerender } = render(dialog(false, first));
		screen.getByRole('button', { name: 'Outside' }).focus();

		rerender(dialog(true, first));
		rerender(dialog(true, latest));
		await user.keyboard('{Escape}');
		expect(first).not.toHaveBeenCalled();
		expect(latest).toHaveBeenCalledTimes(1);

		rerender(dialog(false, latest));
		expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus();
	});
});
