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
	const filtered = q 
		? allFolios.filter(f => f.title.toLowerCase().includes(q) || f.name.replace(/_/g, ' ').toLowerCase().includes(q))
		: allFolios;

	const grouped: Record<string, typeof allFolios> = {};
	const sortedFolios = [...filtered].sort((a, b) => a.title.localeCompare(b.title));

	for (const folio of sortedFolios) {
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
				{letters.map(letter => (
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
				))}
			</div>
		</div>
	);
}
