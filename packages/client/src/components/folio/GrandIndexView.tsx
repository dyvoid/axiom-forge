import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFolios } from '../../api/queries.js';
import { Icon } from '../ui/Icon.js';
import styles from './GrandIndexView.module.css';
import { useProject } from '../../context/ProjectContext.js';

export function GrandIndexView(): JSX.Element {
	const { data: folios, isLoading } = useFolios();
	const { schema } = useProject();
	const [query, setQuery] = useState('');

	if (isLoading) return <div className={styles.container}>Loading...</div>;

	const allFolios = folios ?? [];
	const q = query.trim().toLowerCase();
	
	const scoredFolios = allFolios.map(f => {
		if (!q) return { folio: f, score: 0 };
		const title = f.title.toLowerCase();
		const name = f.name.replace(/_/g, ' ').toLowerCase();
		const snippet = (f.snippet || '').toLowerCase();
		const folder = f.folder.toLowerCase();
		
		let score = 0;
		if (title === q || name === q) score += 100;
		else if (title.startsWith(q) || name.startsWith(q)) score += 50;
		else if (title.includes(q) || name.includes(q)) score += 10;
		
		if (score === 0 && (`${folder}/${name}`.includes(q) || `${folder}/${title}`.includes(q))) score += 5;
		if (snippet.includes(q)) score += 1;
		
		return { folio: f, score };
	});

	const filtered = q ? scoredFolios.filter(sf => sf.score > 0) : scoredFolios;
	
	filtered.sort((a, b) => {
		if (q && b.score !== a.score) return b.score - a.score;
		return a.folio.title.localeCompare(b.folio.title);
	});

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
					{allFolios.length} {allFolios.length === 1 ? 'ENTRY' : 'ENTRIES'}
				</div>

				<div className={styles.searchBar}>
					<span className={styles.searchIcon}>⌕</span>
					<input
						type="text"
						placeholder="Search the index..."
						className={styles.searchInput}
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
				</div>
			</header>

			<div className={styles.indexColumns}>
				{q ? (
					<div className={styles.letterGroup}>
						<h2 className={styles.letterHeader}>Search Results</h2>
						<div className={styles.letterList}>
							{filtered.length === 0 ? (
								<div style={{ color: 'var(--text-muted)' }}>No results found.</div>
							) : (
								filtered.map(({ folio: f }) => {
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
										</Link>
									);
								})
							)}
						</div>
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
