import { Link, useParams } from 'react-router-dom';
import { useFolios } from '../../api/queries.js';
import { useProject } from '../../context/ProjectContext.js';
import { Icon } from '../ui/Icon.js';
import styles from './CategoryIndexView.module.css';

export function CategoryIndexView(): JSX.Element {
	const { folder } = useParams<{ folder: string }>();
	const { schema } = useProject();
	const { data: folios, isLoading } = useFolios();

	if (isLoading) return <div className={styles.container}>Loading index...</div>;

	const categoryFolios = folios?.filter(f => f.folder === folder) ?? [];
	
	// Find the type definition for this folder
	const typeDefEntry = Object.entries(schema.types).find(([, def]) => def.folder === folder);
	const typeName = typeDefEntry ? typeDefEntry[0] : folder;
	const typeDef = typeDefEntry ? typeDefEntry[1] : null;

	return (
		<div className={styles.container}>
			<header className={styles.header}>
				<div className={styles.headerTop}>
					<div className={styles.eyebrow}>
						{typeDef && <Icon name={typeDef.icon} size={14} />}
						{typeDef && <span className={styles.separator}>·</span>}
						<span>CATEGORY INDEX</span>
					</div>
					<button className={styles.addBtn}>+ ADD ENTRY</button>
				</div>
				<h1 className={styles.title}>{typeName}</h1>
				<div className={styles.meta}>
					{categoryFolios.length} {categoryFolios.length === 1 ? 'ENTRY' : 'ENTRIES'}
				</div>
			</header>

			<div className={styles.list}>
				{categoryFolios.length === 0 ? (
					<div className={styles.empty}>No entries yet.</div>
				) : (
					categoryFolios.map(f => {
						return (
						<Link key={f.id} to={`/folio/${f.folder}/${f.name}`} className={styles.entry}>
							<span className={styles.name}>
								{f.name.replace(/_/g, ' ')}
							</span>
							<div className={styles.entryMeta}>
								{f.snippet ? (
									<span className={styles.snippet}>{f.snippet}</span>
								) : (
									f.tags && f.tags.length > 0 && (
										<span className={styles.tags}>{f.tags.join(' · ')}</span>
									)
								)}
							</div>
						</Link>
					);
					})
				)}
			</div>
		</div>
	);
}
