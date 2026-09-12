import { useRef, useState, useEffect, useMemo } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import { useProject } from '../../context/ProjectContext.js';
import { useFolios } from '../../api/queries.js';
import styles from './Sidebar.module.css';
import { Icon } from '../ui/Icon.js';
import { NewEntryButton } from '../ui/NewEntryButton.js';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }): JSX.Element {
	const { schema, schemaIndex } = useProject();
	const { data: folios } = useFolios();
	const { folder: routeFolder, name: routeName } = useParams<{ folder?: string, name?: string }>();
	const navigate = useNavigate();

	const [activeType, setActiveType] = useState<string>('');

	useEffect(() => {
		if (routeFolder) {
			const typeKey = schemaIndex.typeKeyForFolder(routeFolder);
			if (typeKey) setActiveType(typeKey);
		} else {
			setActiveType('');
		}
	}, [routeFolder, schemaIndex]);

	const byType = useMemo(() => {
		const acc: Record<string, typeof folios> = {};
		if (folios) {
			for (const f of folios) {
				if (!acc[f.type]) acc[f.type] = [];
				acc[f.type]!.push(f);
			}
		}
		return acc;
	}, [folios]);

	const activeList = activeType ? byType[activeType] || [] : [];
	const activeSchema = activeType ? schema.types[activeType] : null;

	// Arrow key navigation between folios in the active category
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				!routeFolder || 
				document.activeElement?.tagName === 'INPUT' || 
				document.activeElement?.tagName === 'TEXTAREA'
			) {
				return;
			}

			if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
				e.preventDefault();
				
				if (routeName && activeSchema) {
					// Navigate between folios
					const currentIndex = activeList.findIndex(f => f.name === routeName);
					if (currentIndex === -1) return;
					
					let nextIndex = currentIndex;
					if (e.key === 'ArrowUp' && currentIndex > 0) {
						nextIndex = currentIndex - 1;
					} else if (e.key === 'ArrowDown' && currentIndex < activeList.length - 1) {
						nextIndex = currentIndex + 1;
					}

					const nextFolio = activeList[nextIndex];
					if (nextIndex !== currentIndex && nextFolio) {
						navigate(`/folio/${activeSchema.folder}/${nextFolio.name}`);
					}
				} else {
					// Navigate between categories
					const { folders } = schemaIndex;
					const currentIndex = folders.indexOf(routeFolder);
					if (currentIndex === -1) return;

					let nextIndex = currentIndex;
					if (e.key === 'ArrowUp' && currentIndex > 0) {
						nextIndex = currentIndex - 1;
					} else if (e.key === 'ArrowDown' && currentIndex < folders.length - 1) {
						nextIndex = currentIndex + 1;
					}

					const nextFolder = folders[nextIndex];
					if (nextIndex !== currentIndex && nextFolder) {
						navigate(`/folio/${nextFolder}`);
					}
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [routeFolder, routeName, activeSchema, activeList, navigate, schemaIndex]);

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
								aria-current={isActive ? 'location' : undefined}
								onClick={() => {
									navigate(`/folio/${typeDef.folder}`);
									onNavigate?.();
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
							{activeList.map((f) => (
								<NavLink
									key={f.id}
									to={`/folio/${activeSchema.folder}/${f.name}`}
									className={({ isActive }) =>
										`${styles.folioLink} ${isActive ? styles.active : ''}`
									}
									onClick={() => onNavigate?.()}
								>
									{f.title}
								</NavLink>
							))}
						</div>
					</div>
				)}
			</nav>

			<div className={styles.footer}>
				{activeSchema && (
					<NewEntryButton folder={activeSchema.folder} typeName={activeType ?? undefined} />
				)}
			</div>
		</div>
	);
}
