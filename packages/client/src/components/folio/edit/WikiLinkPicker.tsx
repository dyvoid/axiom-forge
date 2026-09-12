import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { filenameToDisplayName, scoreFolio } from '@axiom-forge/shared';
import type { WikiLink } from '@axiom-forge/shared';
import { useFolios } from '../../../api/queries.js';
import { useProject } from '../../../context/ProjectContext.js';
import { useCombobox } from '../../../hooks/useCombobox.js';
import {
	isLinkCandidate,
	linkKey,
	parseWikiLinkText,
	searchPlaceholder,
	showsFolderColumn,
} from '../../../utils/links.js';
import { Icon } from '../../ui/Icon.js';
import styles from './fields.module.css';

interface WikiLinkPickerProps {
	/** Currently selected link, or null. */
	value: WikiLink | null;
	/** Schema target folder(s) — filters the dropdown to only folios in this folder. */
	target?: string | string[];
	/** Placeholder text when no value is selected. Defaults to `Search <target>…`. */
	placeholder?: string;
	/** Accessible name for the search input. Falls back to the placeholder. */
	ariaLabel?: string;
	/** Whether to autofocus the search input on mount. */
	autoFocus?: boolean;
	/** Called when the user selects or clears a folio. */
	onChange: (next: WikiLink | null) => void;
}

export function WikiLinkPicker({
	value,
	target,
	placeholder,
	ariaLabel,
	autoFocus,
	onChange,
}: WikiLinkPickerProps): JSX.Element {
	const { schemaIndex } = useProject();
	const { data: folios } = useFolios();

	const [query, setQuery] = useState('');
	const { open, openMenu, closeMenu, highlightIdx, setHighlightIdx, containerRef: wrapRef, menuRef } = useCombobox<HTMLDivElement>();
	const inputRef = useRef<HTMLInputElement | null>(null);
	const listboxId = useId();

	const selectedKey = value ? linkKey(value.folder, value.name) : null;

	// Filtered candidates. Ranking goes through the shared scorer so this picker
	// agrees with the header search and both indexes — including aliases, which
	// the substring match it used before silently missed (ADR-0011).
	const candidates = useMemo(() => {
		if (!folios) return [];
		const selected = new Set(selectedKey ? [selectedKey] : []);
		const inScope = folios.filter((f) => isLinkCandidate(f, target, selected));

		if (!query.trim()) return inScope;

		return inScope
			.map((folio) => ({ folio, rank: scoreFolio(folio, query) }))
			.filter((scored) => scored.rank > 0)
			.sort((a, b) => b.rank - a.rank)
			.map((scored) => scored.folio);
	}, [folios, target, query, selectedKey]);

	// Clamp highlight when candidates change
	useEffect(() => {
		setHighlightIdx(0);
	}, [candidates.length, query]);

	// Resolve icon for a folder
	function folderIcon(folder: string): string {
		return schemaIndex.typeDefForFolder(folder)?.icon || 'circle';
	}

	function handleSelect(folder: string, name: string): void {
		onChange({ folder, name });
		setQuery('');
		closeMenu();
	}

	function handleClear(): void {
		onChange(null);
		setQuery('');
		inputRef.current?.focus();
	}

	function handleKeyDown(e: React.KeyboardEvent): void {
		if (!open) {
			if (e.key === 'ArrowDown' || e.key === 'Enter') {
				openMenu();
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
					const link = parseWikiLinkText(query, target);
					if (link) handleSelect(link.folder, link.name);
				}
				break;
			case 'Escape':
				e.preventDefault();
				closeMenu();
				break;
		}
	}

	// Resolve display for current value
	const selectedFolio = value
		? folios?.find((f) => f.folder === value.folder && f.name === value.name)
		: null;
	const displayName = selectedFolio?.title || (value ? filenameToDisplayName(value.name) : '');

	const showFolder = showsFolderColumn(target);

	return (
		<div ref={wrapRef} className={styles.pickerWrap}>
			<div className={`${styles.pickerInputWrap} ${open ? styles.pickerFocused : ''}`}>
				{value && !open ? (
					<>
						<div
							className={styles.pickerSelected}
							onClick={() => {
								openMenu();
								setTimeout(() => inputRef.current?.focus(), 0);
							}}
						>
							<Icon name={folderIcon(value.folder)} size={12} />
							<span>{displayName}</span>
						</div>
						<button type="button" className={styles.pickerClear} onClick={handleClear} aria-label="Clear selection">
							×
						</button>
					</>
				) : (
					<input
						ref={inputRef}
						autoFocus={autoFocus}
						className={styles.pickerInput}
						value={query}
						placeholder={placeholder || searchPlaceholder(target)}
						role="combobox"
						aria-expanded={open}
						aria-autocomplete="list"
						aria-controls={listboxId}
						aria-activedescendant={open && candidates[highlightIdx] ? `${listboxId}-option-${highlightIdx}` : undefined}
						aria-label={ariaLabel || placeholder || searchPlaceholder(target)}
						onChange={(e) => {
							setQuery(e.target.value);
							openMenu();
						}}
						onFocus={openMenu}
						onClick={openMenu}
						onKeyDown={handleKeyDown}
					/>
				)}
			</div>

			{open && (
				<div ref={menuRef} className={styles.menu} id={listboxId} role="listbox">
					{candidates.length === 0 ? (
						<div className={styles.menuEmpty}>
							{query.trim() ? `Press ↵ to add “${query.trim()}”` : 'No matches'}
						</div>
					) : (
						candidates.map((f, i) => (
							<div
								key={linkKey(f.folder, f.name)}
								id={`${listboxId}-option-${i}`}
								role="option"
								aria-selected={i === highlightIdx}
								className={`${styles.menuItem} ${i === highlightIdx ? styles.menuItemHighlight : ''}`}
								onMouseEnter={() => setHighlightIdx(i)}
								onMouseDown={(e) => {
									e.preventDefault();
									handleSelect(f.folder, f.name);
								}}
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
