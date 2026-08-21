import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useProject } from '../../context/ProjectContext.js';
import { useSearch } from '../../api/queries.js';
import { Icon } from '../ui/Icon.js';
import { EntryContent } from '../ui/EntryContent.js';
import { reloadProject } from '../../api/client.js';
import styles from './TopHeader.module.css';

export function TopHeader({ onToggleDrawer }: { onToggleDrawer: () => void }): JSX.Element {
	const { config } = useProject();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const location = useLocation();
	const [syncing, setSyncing] = useState(false);

	const [query, setQuery] = useState('');
	const [open, setOpen] = useState(false);
	const [highlightIdx, setHighlightIdx] = useState(0);

	const searchRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const { data: results } = useSearch(query);
	const items = results || [];

	// The Grand Index has its own in-place search and tag filter; showing the
	// header's global search there too is a duplicate affordance. Hide it on
	// /index so each route has exactly one search box.
	const showSearch = location.pathname !== '/index';

	// Global shortcut '/'
	useEffect(() => {
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			if (!showSearch) return;
			if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
				e.preventDefault();
				inputRef.current?.focus();
			}
		};
		window.addEventListener('keydown', handleGlobalKeyDown);
		return () => window.removeEventListener('keydown', handleGlobalKeyDown);
	}, [showSearch]);

	// Click outside
	useEffect(() => {
		const handleOutside = (e: MouseEvent) => {
			if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener('mousedown', handleOutside);
		return () => document.removeEventListener('mousedown', handleOutside);
	}, []);

	useEffect(() => {
		setHighlightIdx(0);
	}, [query, items.length]);

	async function handleSync() {
		if (syncing) return;
		setSyncing(true);
		try {
			await reloadProject();
			await queryClient.invalidateQueries();
		} finally {
			setSyncing(false);
		}
	}

	function navigateTo(folder: string, name: string) {
		navigate(`/folio/${encodeURIComponent(folder)}/${encodeURIComponent(name)}`);
		setOpen(false);
		setQuery('');
		inputRef.current?.blur();
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (!open && e.key !== 'Escape') {
			setOpen(true);
		}
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setHighlightIdx((i) => Math.min(i + 1, items.length - 1));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setHighlightIdx((i) => Math.max(i - 1, 0));
				break;
			case 'Enter':
				e.preventDefault();
				if (items[highlightIdx]) {
					navigateTo(items[highlightIdx].folder, items[highlightIdx].name);
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
		<header className={styles.header}>
			<div className={styles.leftGroup}>
				<button
					type="button"
					className={styles.menuBtn}
					onClick={onToggleDrawer}
					aria-label="Toggle navigation"
				>
					<Icon name="menu" size={18} />
				</button>
				<Link to="/index" className={styles.left}>
					<span className={styles.logo}>AXIOM · FORGE</span>
					<div className={styles.separator} />
					<span className={styles.projectTitle}>{config.name}</span>
				</Link>
			</div>
			<div className={styles.right}>
				<button
					className={styles.syncButton}
					onClick={handleSync}
					disabled={syncing}
					title="Reload project from disk"
				>
					<Icon name="refresh-cw" size={14} className={syncing ? styles.spinning : undefined} />
				</button>
				{showSearch && (
					<div ref={searchRef} className={styles.searchBox} style={{ position: 'relative' }}>
						<Icon name="search" size={14} className={styles.searchIcon} />
						<input
							ref={inputRef}
							type="text"
							placeholder="Search the index..."
							className={styles.searchInput}
							value={query}
							onChange={(e) => {
								setQuery(e.target.value);
								setOpen(true);
							}}
							onFocus={() => setOpen(true)}
							onKeyDown={handleKeyDown}
						/>
						{query && (
							<button
								className={styles.clearBtn}
								onClick={() => {
									setQuery('');
									inputRef.current?.focus();
								}}
								title="Clear search"
							>
								<Icon name="x" size={14} />
							</button>
						)}

						{open && query.trim() !== '' && (
							<div className={styles.searchDropdown}>
								{items.length === 0 ? (
									<div className={styles.searchEmpty}>No results found.</div>
								) : (
									items.map((item, idx) => (
										<div
											key={`${item.folder}/${item.name}`}
											className={`${styles.searchItem} ${idx === highlightIdx ? styles.searchItemHighlight : ''}`}
											onMouseEnter={() => setHighlightIdx(idx)}
											onClick={() => navigateTo(item.folder, item.name)}
										>
											<EntryContent folio={item} variant="card" />
										</div>
									))
								)}
							</div>
						)}
					</div>
				)}
			</div>
		</header>
	);
}
