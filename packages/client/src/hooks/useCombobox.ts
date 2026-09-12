import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Shared open/highlight/outside-click state for dropdown-style pickers
 * (tag inputs, selects, search boxes). Each caller still owns its own
 * keyboard handling and rendering — this only centralizes the state that
 * was previously reimplemented separately in every picker component.
 *
 * `openMenu` is exposed as its own function (distinct from focusing the
 * input) so callers can wire it to both `onFocus` and `onClick`. Wiring
 * "reopen" only to `onFocus` is what caused the bug where clicking an
 * already-focused field a second time did nothing: refocusing an element
 * that already has focus fires no `focus` event.
 */
export function useCombobox<T extends HTMLElement = HTMLDivElement>() {
	const [open, setOpen] = useState(false);
	const [highlightIdx, setHighlightIdx] = useState(0);
	const containerRef = useRef<T>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	const openMenu = useCallback(() => setOpen(true), []);
	const closeMenu = useCallback(() => setOpen(false), []);
	const toggleMenu = useCallback(() => setOpen((o) => !o), []);

	useEffect(() => {
		function handleOutside(e: MouseEvent) {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				closeMenu();
			}
		}
		document.addEventListener('mousedown', handleOutside);
		return () => document.removeEventListener('mousedown', handleOutside);
	}, [closeMenu]);

	// Keep the highlighted option scrolled into view as it changes.
	useEffect(() => {
		if (!open || !menuRef.current) return;
		const item = menuRef.current.children[highlightIdx] as HTMLElement | undefined;
		item?.scrollIntoView({ block: 'nearest' });
	}, [highlightIdx, open]);

	return {
		open,
		openMenu,
		closeMenu,
		toggleMenu,
		highlightIdx,
		setHighlightIdx,
		containerRef,
		menuRef,
	};
}
