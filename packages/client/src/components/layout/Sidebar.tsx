import { Link, NavLink } from 'react-router-dom';
import { useProject } from '../../context/ProjectContext.js';
import { useFolios } from '../../api/queries.js';
import styles from './Sidebar.module.css';
import { Icon } from '../ui/Icon.js';
import { toRoman } from '@axiom-forge/shared';

export function Sidebar(): JSX.Element {
	const { config, schema } = useProject();
	const { data: folios } = useFolios();

	// Group folios by type
	const byType: Record<string, typeof folios> = {};
	if (folios) {
		for (const f of folios) {
			if (!byType[f.type]) byType[f.type] = [];
			byType[f.type]!.push(f);
		}
	}

	return (
		<div className={styles.container}>
			<header className={styles.header}>
				<Link to="/" className={styles.projectLink}>
					<span className={styles.projectTitle}>{config.name}</span>
				</Link>
			</header>

			<nav className={styles.nav}>
				<div className={styles.group}>
					<h2 className={styles.groupTitle}>Index</h2>
					{Object.entries(schema.types).map(([typeKey, typeDef]) => {
						const count = byType[typeKey]?.length ?? 0;
						return (
							<div key={typeKey} className={styles.typeRow}>
								<div className={styles.typeLabel}>
									<Icon name={typeDef.icon} />
									<span>{typeKey}</span>
								</div>
								<span className={styles.typeCount}>{count}</span>
							</div>
						);
					})}
				</div>

				{Object.entries(schema.types).map(([typeKey, typeDef]) => {
					const list = byType[typeKey] ?? [];
					if (list.length === 0) return null;

					return (
						<div key={typeKey} className={styles.group}>
							<h2 className={styles.groupTitle}>{typeDef.folder}</h2>
							<div className={styles.folioList}>
								{list.map((f) => {
									const isInactive = typeDef.inactiveWhen?.includes(f.status ?? '');
									return (
										<NavLink
											key={f.id}
											to={`/folio/${f.folder}/${f.name}`}
											className={({ isActive }) => 
												`${styles.folioLink} ${isActive ? styles.active : ''} ${isInactive ? styles.inactive : ''}`
											}
										>
											{f.name.replace(/_/g, ' ')}
										</NavLink>
									);
								})}
							</div>
						</div>
					);
				})}
			</nav>

			<div className={styles.footer}>
				<button className={styles.newBtn}>
					<Icon name="plus" />
					<span>New entry</span>
				</button>
			</div>
		</div>
	);
}
