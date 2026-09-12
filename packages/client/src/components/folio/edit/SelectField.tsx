import { useEffect, useId, useRef } from 'react';
import { useCombobox } from '../../../hooks/useCombobox.js';
import styles from './fields.module.css';

interface Props {
	value: string;
	options: string[];
	onChange: (next: string) => void;
	label?: string;
}

export function SelectField({ value, options, onChange, label }: Props): JSX.Element {
	const { open, openMenu, closeMenu, toggleMenu, highlightIdx, setHighlightIdx, containerRef } = useCombobox<HTMLDivElement>();
	const buttonRef = useRef<HTMLButtonElement | null>(null);
	const listboxId = useId();

	useEffect(() => {
		if (open) {
			setHighlightIdx(Math.max(0, options.indexOf(value)));
		}
	}, [open, options, value]);

	function handleKeyDown(e: React.KeyboardEvent) {
		if (!open) {
			if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				openMenu();
			}
			return;
		}
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setHighlightIdx((i) => Math.min(i + 1, options.length - 1));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setHighlightIdx((i) => Math.max(i - 1, 0));
				break;
			case 'Enter':
				e.preventDefault();
				if (options[highlightIdx] !== undefined) {
					onChange(options[highlightIdx]!);
					closeMenu();
					buttonRef.current?.focus();
				}
				break;
			case 'Escape':
				e.preventDefault();
				closeMenu();
				buttonRef.current?.focus();
				break;
			case ' ':
				e.preventDefault();
				if (options[highlightIdx] !== undefined) {
					onChange(options[highlightIdx]!);
					closeMenu();
					buttonRef.current?.focus();
				}
				break;
		}
	}

	return (
		<div ref={containerRef} className={styles.selectWrap}>
			<button
				ref={buttonRef}
				type="button"
				className={`${styles.selectButton} ${open ? styles.open : ''}`}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={listboxId}
				aria-label={label}
				onClick={toggleMenu}
				onKeyDown={handleKeyDown}
			>
				<span>
					{value || <span className={styles.selectPlaceholder}>—</span>}
				</span>
				<span className={styles.selectArrow} aria-hidden="true">▾</span>
			</button>
			{open && (
				<div className={styles.menu} id={listboxId} role="listbox">
					{options.map((o, i) => (
						<div
							key={o}
							role="option"
							aria-selected={o === value}
							className={`${styles.menuItem} ${o === value ? styles.selected : ''} ${i === highlightIdx ? styles.menuItemHighlight : ''}`}
							onClick={() => {
								onChange(o);
								closeMenu();
								buttonRef.current?.focus();
							}}
							onMouseEnter={() => setHighlightIdx(i)}
						>
							{o}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
