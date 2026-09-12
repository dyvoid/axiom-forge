/**
 * Test setup for packages/client. Runs before every test file, including the
 * node-environment ones, so everything here has to tolerate the absence of a
 * DOM.
 */

if (typeof window !== 'undefined') {
	// Registers jest-dom's DOM matchers (toHaveAttribute, toHaveFocus, ...)
	// onto vitest's expect.
	await import('@testing-library/jest-dom/vitest');

	/*
	 * jsdom implements no layout, so it has no scrollIntoView. useCombobox
	 * calls it to keep the highlighted option visible. Stubbing it is safe --
	 * there is nothing to scroll in a zero-height document -- but it is worth
	 * naming as a thing these tests structurally cannot check. Scroll
	 * behaviour has to be verified in a real browser.
	 */
	if (!Element.prototype.scrollIntoView) {
		Element.prototype.scrollIntoView = function scrollIntoView(): void {
			/* no layout in jsdom; nothing to scroll */
		};
	}
}

export {};
