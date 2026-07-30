import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useFolios } from '../../api/queries.js';
import { Icon } from '../ui/Icon.js';
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

	const scoredFolios = allFolios.map(f => {
		if (selectedTags.length > 0) {
			const hasAllTags = selectedTags.every(t => f.tags?.includes(t));
			if (!hasAllTags) return { folio: f, score: -1 };
		}
		
		if (!q) return { folio: f, score: 0 };
		const title = f.title.toLowerCase();
		const name = f.name.replace(/_/g, ' ').toLowerCase();
		const snippet = (f.snippet || '').toLowerCase();
		const folder = f.folder.toLowerCase();
		const aliases = (f.aliases ?? []).map((a) => a.toLowerCase());

		let score = 0;
		if (title === q || name === q) score += 100;
		else if (title.startsWith(q) || name.startsWith(q)) score += 50;
		else if (title.includes(q) || name.includes(q)) score += 10;

		// Alias tiers mirror ProjectStore.search() so an alias resolves to its
		// folio here exactly as it does in the header search (ADR-0011 will
		// collapse these duplicated scorers into one shared function).
		if (aliases.some((a) => a === q)) score += 80;
		else if (aliases.some((a) => a.startsWith(q))) score += 40;
		else if (aliases.some((a) => a.includes(q))) score += 8;

		if (score === 0 && (`${folder}/${name}`.includes(q) || `${folder}/${title}`.includes(q))) score += 5;
		if (snippet.includes(q)) score += 1;
		
		return { folio: f, score };
	});

	const filtered = scoredFolios.filter(sf => sf.score >= 0 && (q ? sf.score > 0 : true));
	
	filtered.sort((a, b) => {
		if (q && b.score !== a.score) return b.score - a.score;
		return a.folio.title.localeCompare(b.folio.title);
	});

	// Always group alphabetically — search just narrows what's shown
	const grouped: Record<string, typeof allFolios> = {};
	for (const { folio } of filtered) {
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
											<span className={styles.iconWrapper}>
												<Icon name={icon} size={10} />
											</span>
											{f.title}
											{f.aliases && f.aliases.length > 0 && (
												<span className={styles.aliases}>aka {f.aliases.join(' · ')}</span>
											)}
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
