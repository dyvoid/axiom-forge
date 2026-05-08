import { useRef, useState, useEffect } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import { useProject } from '../../context/ProjectContext.js';
import { useFolios, useCreateFolio } from '../../api/queries.js';
import styles from './Sidebar.module.css';
import { Icon } from '../ui/Icon.js';

export function Sidebar(): JSX.Element {
	const { schema } = useProject();
	const { data: folios } = useFolios();
	const { folder: routeFolder } = useParams<{ folder?: string }>();
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

	const byType: Record<string, typeof folios> = {};
	if (folios) {
		for (const f of folios) {
			if (!byType[f.type]) byType[f.type] = [];
			byType[f.type]!.push(f);
		}
	}

	const activeList = activeType ? byType[activeType] || [] : [];
	const activeSchema = activeType ? schema.types[activeType] : null;

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
			status: undefined,
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
				) : (
					<button className={styles.newBtn} onClick={handleNewEntry}>
						+ New entry
					</button>
				)}
			</div>
		</div>
	);
}
