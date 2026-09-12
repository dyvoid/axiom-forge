import { useEffect, useId, useRef, useState } from 'react';
import { useCombobox } from '../../hooks/useCombobox.js';
import { Icon } from './Icon.js';
import styles from './ChipField.module.css';

export interface ChipOption {
	/** Stable identity — also what `onRemove` receives. */
	id: string;
	label: string;
	/** Icon name shown before the label, in both the chip and the dropdown. */
	icon?: string;
	/** Dim text shown at the end of the dropdown row (e.g. a folder name). */
	meta?: string;
	/** Extra text the query matches against, beyond label and meta. */
	search?: string;
}

interface Props {
	chips: ChipOption[];
	/** Selectable options. Callers filter out anything already chosen. */
	options: ChipOption[];
	onAdd: (option: ChipOption) => void;
	onRemove: (id: string) => void;
	/**
	 * Provide to allow committing typed text that matches no option.
	 * Omit for closed vocabularies (a fixed schema list), where typing
	 * only filters.
	 */
	onAddRaw?: (raw: string) => void;
	placeholder?: string;
	ariaLabel?: string;
	/** Icon rendered before the chips. */
	leadingIcon?: string;
	/** Provide to offer a clear-all control once there are chips. */
	onClearAll?: () => void;
	/**
	 * Rank an option against the typed query; 0 excludes it. Callers backed by
	 * folios pass `scoreFolio` so this control ranks identically to every other
	 * search surface (ADR-0011). Defaults to substring matching, which is all a
	 * plain string vocabulary needs.
	 */
	score?: (option: ChipOption, query: string) => number;
}

function substringScore(option: ChipOption, query: string): number {
	const haystack = `${option.label} ${option.meta ?? ''} ${option.search ?? ''}`.toLowerCase();
	return haystack.includes(query.toLowerCase()) ? 1 : 0;
}

/**
 * The one multi-value picker. Every field that holds a set of values —
 * free-text tags, fixed option lists, references to other folios — renders
 * through this, so they share one appearance and one interaction model.
 * What varies between them is data (where options come from, whether typed
 * text can be committed), never the control itself.
 */
export function ChipField({
	chips,
	options,
	onAdd,
	onRemove,
	onAddRaw,
	placeholder = 'add…',
	ariaLabel,
	leadingIcon,
	onClearAll,
	score = substringScore,
}: Props): JSX.Element {
	const [query, setQuery] = useState('');
	const { open, openMenu, closeMenu, highlightIdx, setHighlightIdx, containerRef, menuRef } =
		useCombobox<HTMLDivElement>();
	const inputRef = useRef<HTMLInputElement>(null);
	const listboxId = useId();

	const candidates = query.trim()
		? options
			.map((option) => ({ option, rank: score(option, query) }))
			.filter((scored) => scored.rank > 0)
			.sort((a, b) => b.rank - a.rank)
			.map((scored) => scored.option)
		: options;

	useEffect(() => {
		setHighlightIdx(0);
	}, [query, candidates.length]);

	function commitOption(option: ChipOption): void {
		onAdd(option);
		setQuery('');
		closeMenu();
		inputRef.current?.focus();
	}

	function commitRaw(): void {
		const raw = query.trim();
		if (!raw || !onAddRaw) return;
		onAddRaw(raw);
		setQuery('');
		closeMenu();
		inputRef.current?.focus();
	}

	function handleKeyDown(e: React.KeyboardEvent): void {
		if (e.key === 'Backspace' && !query && chips.length) {
			onRemove(chips[chips.length - 1]!.id);
			return;
		}

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				if (!open) {
					openMenu();
					return;
				}
				setHighlightIdx((i) => Math.min(i + 1, Math.max(candidates.length - 1, 0)));
				return;
			case 'ArrowUp':
				e.preventDefault();
				setHighlightIdx((i) => Math.max(i - 1, 0));
				return;
			case 'Enter':
			case ',':
				e.preventDefault();
				if (open && candidates[highlightIdx]) {
					commitOption(candidates[highlightIdx]!);
				} else {
					commitRaw();
				}
				return;
			case 'Escape':
				e.preventDefault();
				closeMenu();
				return;
		}
	}

	return (
		<div className={styles.wrap} ref={containerRef}>
			<div
				className={styles.box}
				role="group"
				aria-label={ariaLabel}
				onClick={() => {
					inputRef.current?.focus();
					openMenu();
				}}
			>
				{leadingIcon && (
					<span className={styles.leadingIcon}>
						<Icon name={leadingIcon} size={16} />
					</span>
				)}

				{chips.map((chip) => (
					<span key={chip.id} className={styles.chip}>
						{chip.icon && <Icon name={chip.icon} size={10} />}
						<span>{chip.label}</span>
						<button
							type="button"
							className={styles.chipRemove}
							aria-label={`Remove ${chip.label}`}
							onClick={(e) => {
								e.stopPropagation();
								onRemove(chip.id);
							}}
						>
							×
						</button>
					</span>
				))}

				<input
					ref={inputRef}
					type="text"
					className={styles.input}
					value={query}
					placeholder={placeholder}
					aria-label={ariaLabel}
					role="combobox"
					aria-expanded={open}
					aria-autocomplete="list"
					aria-controls={listboxId}
					aria-activedescendant={
						open && candidates[highlightIdx] ? `${listboxId}-option-${highlightIdx}` : undefined
					}
					onChange={(e) => {
						setQuery(e.target.value);
						openMenu();
					}}
					onFocus={openMenu}
					onClick={openMenu}
					onKeyDown={handleKeyDown}
				/>

				{onClearAll && chips.length > 0 && (
					<button
						type="button"
						className={styles.clearAll}
						aria-label="Clear all"
						onClick={(e) => {
							e.stopPropagation();
							onClearAll();
						}}
					>
						<Icon name="x" size={16} />
					</button>
				)}
			</div>

			{open && (candidates.length > 0 || query.trim()) && (
				<div className={styles.menu} ref={menuRef} id={listboxId} role="listbox">
					{candidates.length === 0 ? (
						<div className={styles.menuEmpty}>
							{onAddRaw ? `Press ↵ to add “${query.trim()}”` : 'No matches'}
						</div>
					) : (
						candidates.map((option, idx) => (
							<div
								key={option.id}
								id={`${listboxId}-option-${idx}`}
								role="option"
								aria-selected={idx === highlightIdx}
								className={`${styles.menuItem} ${idx === highlightIdx ? styles.menuItemHighlight : ''}`}
								onMouseEnter={() => setHighlightIdx(idx)}
								onMouseDown={(e) => {
									e.preventDefault();
									commitOption(option);
								}}
							>
								{option.icon && <Icon name={option.icon} size={12} />}
								<span>{option.label}</span>
								{option.meta && <span className={styles.menuItemMeta}>{option.meta}</span>}
							</div>
						))
					)}
				</div>
			)}
		</div>
	);
}
