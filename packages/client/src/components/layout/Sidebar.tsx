import { useState, useEffect } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import { useProject } from '../../context/ProjectContext.js';
import { useFolios } from '../../api/queries.js';
import styles from './Sidebar.module.css';
import { Icon } from '../ui/Icon.js';

export function Sidebar(): JSX.Element {
	const { schema } = useProject();
	const { data: folios } = useFolios();
	const { folder: routeFolder } = useParams<{ folder?: string }>();
	const navigate = useNavigate();

	// Default active type to the route's folder, or the first schema type
	const firstType = Object.keys(schema.types)[0] || '';
	const [activeType, setActiveType] = useState<string>(firstType);

	useEffect(() => {
		if (routeFolder) {
			const typeKey = Object.entries(schema.types).find(([, def]) => def.folder === routeFolder)?.[0];
			if (typeKey) setActiveType(typeKey);
		}
	}, [routeFolder, schema.types]);

	// Group folios by type
	const byType: Record<string, typeof folios> = {};
	if (folios) {
		for (const f of folios) {
			if (!byType[f.type]) byType[f.type] = [];
			byType[f.type]!.push(f);
		}
	}

	const activeList = activeType ? byType[activeType] || [] : [];
	const activeSchema = activeType ? schema.types[activeType] : null;

	return (
		<div className={styles.container}>
			<nav className={styles.nav}>
				<div className={styles.group}>
					<h2 className={styles.groupTitle}>INDEX</h2>
					{Object.entries(schema.types).map(([typeKey, typeDef]) => {
						const count = byType[typeKey]?.length ?? 0;
						const isActive = typeKey === activeType;
						return (
							<button
								key={typeKey}
								className={`${styles.typeRow} ${isActive ? styles.activeTypeRow : ''}`}
								onClick={() => {
									navigate(`/folio/${typeDef.folder}`);
								}}
							>
								<div className={styles.typeLabel}>
									<Icon name={typeDef.icon} size={14} />
									<span>{typeKey}</span>
								</div>
								<span className={styles.typeCount}>{count}</span>
							</button>
						);
					})}
				</div>

				<div className={styles.divider} />

				{activeSchema && (
					<div className={styles.group}>
						<h2 className={styles.groupTitle}>{activeSchema.folder}</h2>
						<div className={styles.folioList}>
							{activeList.map((f) => {
								const isInactive = activeSchema.inactiveWhen?.includes(f.status ?? '');
								return (
									<NavLink
										key={f.id}
										to={`/folio/${activeSchema.folder}/${f.name}`}
										className={({ isActive }) =>
											`${styles.folioLink} ${isActive ? styles.active : ''}`
										}
									>
										{f.name.replace(/_/g, ' ')}
									</NavLink>
								);
							})}
						</div>
					</div>
				)}
			</nav>

			<div className={styles.footer}>
				<button className={styles.newBtn}>
					+ New entry
				</button>
			</div>
		</div>
	);
}
