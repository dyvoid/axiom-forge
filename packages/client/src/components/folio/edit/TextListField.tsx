import { useState, useRef, useEffect } from 'react';
import styles from './fields.module.css';

interface Props {
	value: string[];
	onChange: (next: string[]) => void;
	placeholder?: string;
	suggestions?: string[];
}

export function TextListField({ value, onChange, placeholder, suggestions }: Props): JSX.Element {
	const [draft, setDraft] = useState('');
	const [open, setOpen] = useState(false);
	const [highlightIdx, setHighlightIdx] = useState(0);

	const containerRef = useRef<HTMLDivElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const availableSuggestions = suggestions?.filter(t => !value.includes(t)) || [];
	const filteredSuggestions = draft
		? availableSuggestions.filter(t => t.toLowerCase().includes(draft.toLowerCase()))
		: availableSuggestions;

	useEffect(() => {
		const handleOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setOpen(false);
				// When closing by clicking outside, commit any pending text
				if (draft.trim()) {
					commit();
				}
			}
		};
		document.addEventListener('mousedown', handleOutside);
		return () => document.removeEventListener('mousedown', handleOutside);
	}, [draft, value]); // added dependencies because commit() uses them

	useEffect(() => {
		setHighlightIdx(0);
	}, [draft, filteredSuggestions.length]);

	useEffect(() => {
		if (!open || !menuRef.current) return;
		const items = menuRef.current.children;
		const item = items[highlightIdx] as HTMLElement | undefined;
		if (item) {
			item.scrollIntoView({ block: 'nearest' });
		}
	}, [highlightIdx, open]);

	function commit(text?: string): void {
		const trimmed = (text ?? draft).trim();
		if (!trimmed) return;
		if (!value.includes(trimmed)) {
			onChange([...value, trimmed]);
		}
		setDraft('');
		setOpen(false);
		inputRef.current?.focus();
	}

	return (
		<div className={styles.pickerWrap} ref={containerRef}>
			<div className={styles.tagBox} onClick={() => inputRef.current?.focus()}>
				{value.map((item, i) => (
					<span key={`${item}-${i}`} className={styles.chip}>
						{item}
						<button
							type="button"
							className={styles.chipRemove}
							onClick={(e) => {
								e.stopPropagation();
								onChange(value.filter((_, x) => x !== i));
							}}
						>
							×
						</button>
					</span>
				))}
				<input
					ref={inputRef}
					className={styles.tagInput}
					value={draft}
					placeholder={placeholder ?? (value.length === 0 ? 'add value, press ↵' : 'add…')}
					onChange={(e) => {
						setDraft(e.target.value);
						if (suggestions) setOpen(true);
					}}
					onFocus={() => {
						if (suggestions) setOpen(true);
					}}
					onKeyDown={(e) => {
						if (open && filteredSuggestions.length > 0) {
							switch (e.key) {
								case 'ArrowDown':
									e.preventDefault();
									setHighlightIdx(i => Math.min(i + 1, filteredSuggestions.length - 1));
									return;
								case 'ArrowUp':
									e.preventDefault();
									setHighlightIdx(i => Math.max(i - 1, 0));
									return;
								case 'Enter':
									e.preventDefault();
									if (filteredSuggestions[highlightIdx]) {
										commit(filteredSuggestions[highlightIdx]);
									} else {
										commit();
									}
									return;
								case 'Escape':
									e.preventDefault();
									setOpen(false);
									return;
							}
						}
						
						if (e.key === 'Enter' || e.key === ',') {
							e.preventDefault();
							commit();
						} else if (e.key === 'Backspace' && !draft && value.length) {
							onChange(value.slice(0, -1));
						}
					}}
					onBlur={() => {
						// If we have a dropdown, don't commit on blur immediately, 
						// let the click outside handler or mousedown handle it.
						if (!suggestions) {
							commit();
						}
					}}
				/>
			</div>
			{open && filteredSuggestions.length > 0 && (
				<div className={styles.menu} ref={menuRef}>
					{filteredSuggestions.map((item, idx) => (
						<div
							key={item}
							className={`${styles.menuItem} ${idx === highlightIdx ? styles.menuItemHighlight : ''}`}
							onMouseEnter={() => setHighlightIdx(idx)}
							onMouseDown={(e) => {
								e.preventDefault();
								commit(item);
							}}
						>
							{item}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
