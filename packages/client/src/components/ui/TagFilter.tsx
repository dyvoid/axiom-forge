import { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon.js';
import bar from './FilterBar.module.css';
import styles from './TagFilter.module.css';

interface TagFilterProps {
	availableTags: string[];
	selectedTags: string[];
	onChange: (tags: string[]) => void;
}

export function TagFilter({ availableTags, selectedTags, onChange }: TagFilterProps): JSX.Element {
	const [query, setQuery] = useState('');
	const [open, setOpen] = useState(false);
	const [highlightIdx, setHighlightIdx] = useState(0);

	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	const unselectedTags = availableTags.filter(t => !selectedTags.includes(t));
	const filteredTags = query 
		? unselectedTags.filter(t => t.toLowerCase().includes(query.toLowerCase()))
		: unselectedTags;

	useEffect(() => {
		const handleOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener('mousedown', handleOutside);
		return () => document.removeEventListener('mousedown', handleOutside);
	}, []);

	useEffect(() => {
		setHighlightIdx(0);
	}, [query, filteredTags.length]);

	// Scroll highlighted item into view
	useEffect(() => {
		if (!open || !menuRef.current) return;
		const items = menuRef.current.children;
		const item = items[highlightIdx] as HTMLElement | undefined;
		if (item) {
			item.scrollIntoView({ block: 'nearest' });
		}
	}, [highlightIdx, open]);

	function addTag(tag: string) {
		onChange([...selectedTags, tag]);
		setQuery('');
		setOpen(false);
		inputRef.current?.focus();
	}

	function removeTag(tag: string) {
		onChange(selectedTags.filter(t => t !== tag));
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === 'Backspace' && query === '' && selectedTags.length > 0) {
			removeTag(selectedTags[selectedTags.length - 1]);
			return;
		}

		if (!open && e.key !== 'Escape') {
			setOpen(true);
		}

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setHighlightIdx(i => Math.min(i + 1, filteredTags.length - 1));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setHighlightIdx(i => Math.max(i - 1, 0));
				break;
			case 'Enter':
				e.preventDefault();
				if (filteredTags[highlightIdx]) {
					addTag(filteredTags[highlightIdx]);
				}
				break;
			case 'Escape':
				e.preventDefault();
				setOpen(false);
				inputRef.current?.blur();
				break;
		}
	}

	return (
		<div className={styles.container} ref={containerRef}>
			{/* Uses the shared FilterBar classes for bar/icon/input */}
			<div
				className={`${bar.bar} ${styles.box}`}
				onClick={() => inputRef.current?.focus()}
			>
				<span className={bar.icon}>
					<Icon name="tag" size={18} />
				</span>
				{selectedTags.map(tag => (
					<span key={tag} className={styles.chip}>
						{tag}
						<button 
							type="button" 
							className={styles.chipRemove} 
							onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
						>
							<Icon name="x" size={10} />
						</button>
					</span>
				))}
				<input
					ref={inputRef}
					type="text"
					className={bar.input}
					value={query}
					onChange={e => { setQuery(e.target.value); setOpen(true); }}
					onFocus={() => setOpen(true)}
					onKeyDown={handleKeyDown}
					placeholder={selectedTags.length === 0 ? "Filter by tags..." : ""}
				/>
				{selectedTags.length > 0 && (
					<button
						type="button"
						className={bar.clearBtn}
						onClick={(e) => {
							e.stopPropagation();
							onChange([]);
						}}
						title="Clear all tags"
					>
						<Icon name="x" size={16} />
					</button>
				)}
			</div>

			{open && filteredTags.length > 0 && (
				<div className={styles.dropdown} ref={menuRef}>
					{filteredTags.map((tag, idx) => (
						<div
							key={tag}
							className={`${styles.item} ${idx === highlightIdx ? styles.itemHighlight : ''}`}
							onMouseEnter={() => setHighlightIdx(idx)}
							onMouseDown={(e) => {
								e.preventDefault();
								addTag(tag);
							}}
						>
							{tag}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
