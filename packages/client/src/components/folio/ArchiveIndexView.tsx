import { Link } from 'react-router-dom';
import { useFolios } from '../../api/queries.js';
import { Icon } from '../ui/Icon.js';
import styles from './ArchiveIndexView.module.css';
import { useProject } from '../../context/ProjectContext.js';

export function ArchiveIndexView(): JSX.Element {
	const { data: folios, isLoading } = useFolios();
	const { schema } = useProject();

	if (isLoading) return <div className={styles.container}>Loading archive...</div>;

	const allFolios = folios ?? [];
	
	// Group folios by starting letter
	const grouped: Record<string, typeof allFolios> = {};
	
	// Sort all folios alphabetically
	const sortedFolios = [...allFolios].sort((a, b) => a.name.localeCompare(b.name));
	
	for (const folio of sortedFolios) {
		// Clean up the name for display and grouping
		const displayName = folio.name.replace(/_/g, ' ');
		const firstLetter = displayName.charAt(0).toUpperCase();
		
		// If it's not a letter, put it in '#'
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
						placeholder="Search the archive..." 
						className={styles.searchInput}
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
								const displayName = f.name.replace(/_/g, ' ');
								const isInactive = typeDef?.inactiveWhen?.includes(f.status ?? '');
								
								return (
									<Link 
										key={f.id} 
										to={`/folio/${f.folder}/${f.name}`}
										className={`${styles.entryLink} ${isInactive ? styles.deceased : ''}`}
									>
										<span className={styles.iconWrapper}>
											<Icon name={icon} size={10} />
										</span>
										{displayName}
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
