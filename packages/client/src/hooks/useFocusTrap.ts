import { useEffect, useRef } from 'react';

/**
 * Trap keyboard focus inside a container while it is mounted.
 *
 * - On mount: moves focus to the first focusable element (or the container).
 * - On Tab / Shift+Tab: cycles focus within the container.
 * - On Escape: calls `onEscape` if provided.
 * - On unmount: restores focus to the element that had it before the trap opened.
 *
 * Returns a ref to attach to the container element.
 */
export function useFocusTrap<T extends HTMLElement>(onEscape?: () => void): React.RefObject<T> {
	const containerRef = useRef<T>(null);
	const previouslyFocused = useRef<HTMLElement | null>(null);

	useEffect(() => {
		previouslyFocused.current = document.activeElement as HTMLElement | null;

		const container = containerRef.current;
		if (!container) return;

		// Move focus into the container.
		const focusable = getFocusable(container);
		if (focusable.length > 0) {
			focusable[0]!.focus();
		} else {
			container.tabIndex = -1;
			container.focus();
		}

		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				e.preventDefault();
				onEscape?.();
				return;
			}

			if (e.key !== 'Tab') return;

			const currentFocus = document.activeElement as HTMLElement | null;
			const items = getFocusable(container!);
			if (items.length === 0) {
				e.preventDefault();
				container!.focus();
				return;
			}

			const first = items[0]!;
			const last = items[items.length - 1]!;

			if (e.shiftKey) {
				if (currentFocus === first || !container!.contains(currentFocus)) {
					e.preventDefault();
					last.focus();
				}
			} else {
				if (currentFocus === last || !container!.contains(currentFocus)) {
					e.preventDefault();
					first.focus();
				}
			}
		}

		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('keydown', handleKeyDown);
			previouslyFocused.current?.focus();
		};
	}, [onEscape]);

	return containerRef;
}

function getFocusable(root: HTMLElement): HTMLElement[] {
	const selector = [
		'a[href]',
		'button:not([disabled])',
		'input:not([disabled])',
		'textarea:not([disabled])',
		'select:not([disabled])',
		'[tabindex]:not([tabindex="-1"])',
	]
		.join(',');

	return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
		(el) => el.offsetParent !== null || el === document.activeElement,
	);
}
