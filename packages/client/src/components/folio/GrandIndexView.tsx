import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { rankFolios } from '@axiom-forge/shared';
import { useFolios } from '../../api/queries.js';
import { Icon } from '../ui/Icon.js';
import { EntryContent } from '../ui/EntryContent.js';
import { TagFilter } from '../ui/TagFilter.js';
import bar from '../ui/FilterBar.module.css';
import styles from './GrandIndexView.module.css';
import { useProject } from '../../context/ProjectContext.js';

export function GrandIndexView(): JSX.Element {
	const { data: folios, isLoading } = useFolios();
	const { schema } = useProject();
	const [query, setQuery] = useState('');
	const [searchParams, setSearchParams] = useSearchParams();

	if (isLoading) return <div className={styles.container}>Loading...</div>;

	const allFolios = folios ?? [];
	const q = query.trim().toLowerCase();
	
	const allTags = Array.from(new Set(allFolios.flatMap(f => f.tags || []))).sort();
	const selectedTags = searchParams.get('tags')?.split(',').filter(Boolean) || [];

	const handleTagsChange = (tags: string[]) => {
		const newParams = new URLSearchParams(searchParams);
		if (tags.length > 0) {
			newParams.set('tags', tags.join(','));
		} else {
			newParams.delete('tags');
		}
		setSearchParams(newParams);
	};

	const tagFiltered = selectedTags.length > 0
		? allFolios.filter(f => selectedTags.every(t => f.tags?.includes(t)))
		: allFolios;

	// Ranking is shared with the server and the category index (ADR-0011).
	// Grouping below is alphabetical either way, so rank order only decides
	// placement within a letter.
	const filtered = q
		? rankFolios(tagFiltered, q)
		: [...tagFiltered].sort((a, b) => a.title.localeCompare(b.title));

	// Always group alphabetically — search just narrows what's shown
	const grouped: Record<string, typeof allFolios> = {};
	for (const folio of filtered) {
		const firstLetter = folio.title.charAt(0).toUpperCase();
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
					{filtered.length} {filtered.length === 1 ? 'ENTRY' : 'ENTRIES'}
				</div>

				<div className={styles.filterRow}>
					{/* Search bar — uses the shared FilterBar classes */}
					<div className={bar.bar}>
						<span className={bar.icon}>
							<Icon name="search" size={18} />
						</span>
						<input
							type="text"
							placeholder="Search the index..."
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
								title="Clear search"
							>
								<Icon name="x" size={16} />
							</button>
						)}
					</div>
					<div style={{ flex: 1 }}>
						<TagFilter 
							availableTags={allTags}
							selectedTags={selectedTags}
							onChange={handleTagsChange}
						/>
					</div>
				</div>
			</header>

			<div className={styles.indexColumns}>
				{filtered.length === 0 && (q || selectedTags.length > 0) ? (
					<div style={{ color: 'var(--text-muted)', fontFamily: 'var(--ff-body)', fontStyle: 'italic' }}>
						No results found.
					</div>
				) : (
					letters.map(letter => (
						<div key={letter} className={styles.letterGroup}>
							<h2 className={styles.letterHeader}>{letter}</h2>
							<div className={styles.letterList}>
								{grouped[letter]!.map(f => {
									const typeDef = Object.values(schema.types).find(t => t.folder === f.folder);
									const icon = typeDef?.icon || 'circle';
									return (
										<Link
											key={f.id}
											to={`/folio/${f.folder}/${f.name}`}
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
