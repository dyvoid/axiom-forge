import { useRef, useState, useEffect, useMemo } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import { useProject } from '../../context/ProjectContext.js';
import { useFolios, useCreateFolio } from '../../api/queries.js';
import styles from './Sidebar.module.css';
import { Icon } from '../ui/Icon.js';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }): JSX.Element {
	const { schema } = useProject();
	const { data: folios } = useFolios();
	const { folder: routeFolder, name: routeName } = useParams<{ folder?: string, name?: string }>();
	const navigate = useNavigate();
	const createFolio = useCreateFolio();

	const [activeType, setActiveType] = useState<string>('');
	const [creating, setCreating] = useState(false);
	const [newName, setNewName] = useState('');
	const nameInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (routeFolder) {
			const typeKey = Object.entries(schema.types).find(([, def]) => def.folder === routeFolder)?.[0];
			if (typeKey) setActiveType(typeKey);
		} else {
			setActiveType('');
		}
	}, [routeFolder, schema.types]);

	useEffect(() => {
		if (creating) nameInputRef.current?.focus();
	}, [creating]);

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

					if (nextIndex !== currentIndex) {
						const nextFolio = activeList[nextIndex];
						navigate(`/folio/${activeSchema.folder}/${nextFolio.name}`);
					}
				} else {
					// Navigate between categories
					const typeKeys = Object.keys(schema.types);
					const currentIndex = typeKeys.findIndex(k => schema.types[k].folder === routeFolder);
					if (currentIndex === -1) return;

					let nextIndex = currentIndex;
					if (e.key === 'ArrowUp' && currentIndex > 0) {
						nextIndex = currentIndex - 1;
					} else if (e.key === 'ArrowDown' && currentIndex < typeKeys.length - 1) {
						nextIndex = currentIndex + 1;
					}

					if (nextIndex !== currentIndex) {
						const nextFolder = schema.types[typeKeys[nextIndex]].folder;
						navigate(`/folio/${nextFolder}`);
					}
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [routeFolder, routeName, activeSchema, activeList, navigate]);

	function handleNewEntry(): void {
		setNewName('');
		setCreating(true);
	}

	function handleCreateSubmit(): void {
		const trimmed = newName.trim();
		if (!trimmed || !activeSchema) return;
		setCreating(false);

		const folio = {
			type: activeType,
			folder: activeSchema.folder,
			name: '',
			title: trimmed,
			tags: [],
			sections: {},
			warnings: [],
		};
		createFolio.mutate({ folder: activeSchema.folder, folio });
	}

	function handleCreateKeyDown(e: React.KeyboardEvent): void {
		if (e.key === 'Enter') handleCreateSubmit();
		if (e.key === 'Escape') { setCreating(false); setNewName(''); }
	}

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
				{creating ? (
					<div className={styles.newEntryForm}>
						<input
							ref={nameInputRef}
							className={styles.newEntryInput}
							value={newName}
							onChange={(e) => setNewName(e.target.value)}
							onKeyDown={handleCreateKeyDown}
							placeholder={`New ${activeType || 'entry'}…`}
							disabled={createFolio.isPending}
						/>
						<button
							type="button"
							className={styles.newEntryConfirm}
							onClick={handleCreateSubmit}
							disabled={!newName.trim() || createFolio.isPending}
						>
							↵
						</button>
					</div>
				) : activeSchema ? (
					<button
						className={styles.newBtn}
						onClick={handleNewEntry}
					>
						+ New entry
					</button>
				) : null}
			</div>
		</div>
	);
}
