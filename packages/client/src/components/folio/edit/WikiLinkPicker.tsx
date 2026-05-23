import { useEffect, useMemo, useRef, useState } from 'react';
import type { WikiLink } from '@axiom-forge/shared';
import { useFolios } from '../../../api/queries.js';
import { useProject } from '../../../context/ProjectContext.js';
import { Icon } from '../../ui/Icon.js';
import styles from './fields.module.css';

interface WikiLinkPickerProps {
	/** Currently selected link, or null. */
	value: WikiLink | null;
	/** Schema target folder(s) — filters the dropdown to only folios in this folder. */
	target?: string | string[];
	/** Placeholder text when no value is selected. */
	placeholder?: string;
	/** Wikilinks already selected (for list mode) — excluded from dropdown. */
	exclude?: WikiLink[];
	/** If true, renders seamlessly inside a tag container without borders. */
	inline?: boolean;
	/** Whether to autofocus the search input on mount. */
	autoFocus?: boolean;
	/** Called when the user selects or clears a folio. */
	onChange: (next: WikiLink | null) => void;
}

export function WikiLinkPicker({
	value,
	target,
	placeholder,
	exclude,
	inline,
	autoFocus,
	onChange,
}: WikiLinkPickerProps): JSX.Element {
	const { schema } = useProject();
	const { data: folios } = useFolios();

	const [query, setQuery] = useState('');
	const [open, setOpen] = useState(false);
	const [highlightIdx, setHighlightIdx] = useState(0);
	const wrapRef = useRef<HTMLDivElement | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const menuRef = useRef<HTMLDivElement | null>(null);

	// Click-outside handler
	useEffect(() => {
		function handleOutside(e: MouseEvent) {
			if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener('mousedown', handleOutside);
		return () => document.removeEventListener('mousedown', handleOutside);
	}, []);

	// Build the set of excluded keys for fast lookup
	const excludeSet = useMemo(() => {
		const set = new Set<string>();
		if (exclude) {
			for (const link of exclude) {
				set.add(`${link.folder}/${link.name}`);
			}
		}
		if (value) {
			set.add(`${value.folder}/${value.name}`);
		}
		return set;
	}, [exclude, value]);

	// Filtered candidates
	const candidates = useMemo(() => {
		if (!folios) return [];
		const q = query.toLowerCase().trim();
		return folios.filter((f) => {
			// Target folder filter
			if (target) {
				if (Array.isArray(target) ? !target.includes(f.folder) : f.folder !== target) {
					return false;
				}
			}
			// Exclude already-selected
			if (excludeSet.has(`${f.folder}/${f.name}`)) return false;
			// Query filter
			if (q) {
				const title = f.title.toLowerCase();
				const name = f.name.replace(/_/g, ' ').toLowerCase();
				return title.includes(q) || name.includes(q);
			}
			return true;
		});
	}, [folios, target, query, excludeSet]);

	// Clamp highlight when candidates change
	useEffect(() => {
		setHighlightIdx(0);
	}, [candidates.length, query]);

	// Scroll highlighted item into view
	useEffect(() => {
		if (!open || !menuRef.current) return;
		const items = menuRef.current.children;
		const item = items[highlightIdx] as HTMLElement | undefined;
		if (item) {
			item.scrollIntoView({ block: 'nearest' });
		}
	}, [highlightIdx, open]);

	// Resolve icon for a folder
	function folderIcon(folder: string): string {
		const entry = Object.entries(schema.types).find(([, def]) => def.folder === folder);
		return entry?.[1].icon || 'circle';
	}

	function parseRaw(raw: string): WikiLink | null {
		const str = raw.trim();
		if (!str) return null;
		
		const parts = str.split('/');
		let folder = '';
		let name = '';
		
		if (parts.length > 1) {
			folder = parts[0]!;
			name = parts.slice(1).join('/');
		} else {
			name = str;
			if (Array.isArray(target) && target.length > 0) {
				folder = target[0]!;
			} else if (typeof target === 'string' && target) {
				folder = target;
			} else {
				folder = 'Unsorted';
			}
		}
		
		name = name.replace(/\s+/g, '_');
		return { folder, name };
	}

	function handleSelect(folder: string, name: string): void {
		onChange({ folder, name });
		setQuery('');
		setOpen(false);
	}

	function handleClear(): void {
		onChange(null);
		setQuery('');
		inputRef.current?.focus();
	}

	function handleKeyDown(e: React.KeyboardEvent): void {
		if (!open) {
			if (e.key === 'ArrowDown' || e.key === 'Enter') {
				setOpen(true);
				e.preventDefault();
			}
			return;
		}
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setHighlightIdx((i) => Math.min(i + 1, candidates.length - 1));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setHighlightIdx((i) => Math.max(i - 1, 0));
				break;
			case 'Enter':
				e.preventDefault();
				if (candidates[highlightIdx]) {
					handleSelect(candidates[highlightIdx]!.folder, candidates[highlightIdx]!.name);
				} else {
					const link = parseRaw(query);
					if (link) handleSelect(link.folder, link.name);
				}
				break;
			case 'Escape':
				e.preventDefault();
				setOpen(false);
				break;
		}
	}

	// Resolve display for current value
	const selectedFolio = value
		? folios?.find((f) => f.folder === value.folder && f.name === value.name)
		: null;
	const displayName = selectedFolio?.title || value?.name.replace(/_/g, ' ') || '';

	const targetDisplay = Array.isArray(target) ? target.join(', ') : target;
	const showFolder = !target || (Array.isArray(target) && target.length > 1);

	const wrapClass = inline
		? `${styles.pickerWrap} ${styles.pickerWrapInline}`
		: styles.pickerWrap;

	const inputWrapClass = inline
		? ''
		: `${styles.pickerInputWrap} ${open ? styles.pickerFocused : ''}`;

	return (
		<div ref={wrapRef} className={wrapClass}>
			<div className={inputWrapClass}>
				{value && !open ? (
					<>
						<div
							className={styles.pickerSelected}
							onClick={() => {
								setOpen(true);
								setTimeout(() => inputRef.current?.focus(), 0);
							}}
						>
							<Icon name={folderIcon(value.folder)} size={12} />
							<span>{displayName}</span>
						</div>
						<button type="button" className={styles.pickerClear} onClick={handleClear}>
							×
						</button>
					</>
				) : (
					<input
						ref={inputRef}
						autoFocus={autoFocus}
						className={inline ? styles.tagPickerInput : styles.pickerInput}
						value={query}
						placeholder={placeholder || (targetDisplay ? `Search ${targetDisplay}…` : 'Search folios…')}
						onChange={(e) => {
							setQuery(e.target.value);
							if (!open) setOpen(true);
						}}
						onFocus={() => setOpen(true)}
						onKeyDown={handleKeyDown}
					/>
				)}
			</div>

			{open && (
				<div ref={menuRef} className={styles.menu}>
					{candidates.length === 0 ? (
						<div className={styles.menuEmpty}>
							{query.trim() ? `Press ↵ to add "${query.trim()}"` : 'No matches'}
						</div>
					) : (
						candidates.map((f, i) => (
							<div
								key={`${f.folder}/${f.name}`}
								className={`${styles.menuItem} ${i === highlightIdx ? styles.menuItemHighlight : ''}`}
								onMouseEnter={() => setHighlightIdx(i)}
								onClick={() => handleSelect(f.folder, f.name)}
							>
								<div className={styles.menuItemRow}>
									<Icon name={folderIcon(f.folder)} size={12} />
									<span>{f.title}</span>
									{showFolder && (
										<span className={styles.menuItemFolder}>{f.folder}</span>
									)}
								</div>
							</div>
						))
					)}
				</div>
			)}
		</div>
	);
}
