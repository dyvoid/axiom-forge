import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFolios } from '../../api/queries.js';
import { Icon } from '../ui/Icon.js';
import { EntryContent } from '../ui/EntryContent.js';
import { TagFilter } from '../ui/TagFilter.js';
import { EmptyState } from '../ui/EmptyState.js';
import { LoadingState } from '../ui/LoadingState.js';
import { useTagFilterParams } from '../../hooks/useTagFilterParams.js';
import { collectTags, filterFolios } from '../../utils/filterFolios.js';
import bar from '../ui/FilterBar.module.css';
import styles from './GrandIndexView.module.css';
import { useProject } from '../../context/ProjectContext.js';

export function GrandIndexView(): JSX.Element {
	const { data: folios, isLoading } = useFolios();
	const { schemaIndex } = useProject();
	const [query, setQuery] = useState('');
	const [selectedTags, setSelectedTags] = useTagFilterParams();

	const allTags = useMemo(() => collectTags(folios ?? []), [folios]);
	// Grouping below is alphabetical either way, so rank order only decides
	// placement within a letter.
	const filtered = useMemo(
		() => filterFolios({ folios: folios ?? [], query, tags: selectedTags, order: 'relevance' }),
		[folios, query, selectedTags],
	);

	if (isLoading) return <div className={styles.container}><LoadingState message="Loading index" /></div>;

	const q = query.trim();

	// Always group alphabetically — search just narrows what's shown
	const grouped: Record<string, typeof filtered> = {};
	for (const folio of filtered) {
		// NFD splits "É" into "E" plus a combining mark, so it files under E.
		const firstLetter = folio.title.normalize('NFD').charAt(0).toUpperCase();
		const groupKey = /[A-Z]/.test(firstLetter) ? firstLetter : '#';
		if (!grouped[groupKey]) grouped[groupKey] = [];
		grouped[groupKey]!.push(folio);
	}

	const letters = Object.keys(grouped).sort();

	return (
		<div className={styles.container}>
			<header className={styles.header}>
				<h1 className={styles.title}>Grand Index</h1>
				<div className={styles.meta}>
					{filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
				</div>

				<div className={styles.filterRow}>
					{/* Search bar — uses the shared FilterBar classes */}
					<div className={bar.bar}>
						<span className={bar.icon}>
							<Icon name="search" size={18} />
						</span>
						<input
							type="text"
							placeholder="Search the index…"
							aria-label="Search the index"
							className={bar.input}
							value={query}
							onChange={(e) => setQuery(e.target.value)}
						/>
						{query && (
							<button
								type="button"
								className={bar.clearBtn}
								onClick={(e) => {
									e.stopPropagation();
									setQuery('');
								}}
								aria-label="Clear search"
							>
								<Icon name="x" size={16} />
							</button>
						)}
					</div>
					<div className={styles.tagFilterCol}>
						<TagFilter 
							availableTags={allTags}
							selectedTags={selectedTags}
							onChange={setSelectedTags}
						/>
					</div>
				</div>
			</header>

			<div className={styles.indexColumns}>
				{filtered.length === 0 && (q || selectedTags.length > 0) ? (
					<div className={styles.empty}>
						<EmptyState
							variant="inline"
							icon="search-x"
							message="No results found. Try a different search, or clear the tag filter."
						/>
					</div>
				) : (
					letters.map(letter => (
						<div key={letter} className={styles.letterGroup}>
							<h2 className={styles.letterHeader}>{letter}</h2>
							<div className={styles.letterList}>
								{grouped[letter]!.map(f => {
									const icon = schemaIndex.typeDefForFolder(f.folder)?.icon || 'circle';
									return (
										<Link
											key={f.id}
											to={`/folio/${encodeURIComponent(f.folder)}/${encodeURIComponent(f.name)}`}
											className={styles.entryLink}
										>
											<EntryContent folio={f} variant="inline" icon={icon} />
										</Link>
									);
								})}
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
