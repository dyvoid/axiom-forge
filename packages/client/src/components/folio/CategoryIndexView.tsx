import { useRef, useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useFolios, useCreateFolio } from '../../api/queries.js';
import { useProject } from '../../context/ProjectContext.js';
import { Icon } from '../ui/Icon.js';
import styles from './CategoryIndexView.module.css';

export function CategoryIndexView(): JSX.Element {
	const { folder } = useParams<{ folder: string }>();
	const { schema } = useProject();
	const { data: folios, isLoading } = useFolios();
	const createFolio = useCreateFolio();
	const [creating, setCreating] = useState(false);
	const [newName, setNewName] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (creating) inputRef.current?.focus();
	}, [creating]);

	if (isLoading) return <div className={styles.container}>Loading index...</div>;

	const categoryFolios = folios?.filter(f => f.folder === folder) ?? [];

	const typeDefEntry = Object.entries(schema.types).find(([, def]) => def.folder === folder);
	const typeName = typeDefEntry ? typeDefEntry[0] : folder;
	const typeDef = typeDefEntry ? typeDefEntry[1] : null;

	function handleCreateSubmit(): void {
		const trimmed = newName.trim();
		if (!trimmed || !folder) return;
		setCreating(false);
		const folio = {
			type: typeName ?? '',
			folder: folder,
			name: trimmed.replace(/ /g, '_'),
			status: undefined,
			tags: [],
			sections: {},
			warnings: [],
		};
		createFolio.mutate({ folder, folio });
	}

	function handleKeyDown(e: React.KeyboardEvent): void {
		if (e.key === 'Enter') handleCreateSubmit();
		if (e.key === 'Escape') { setCreating(false); setNewName(''); }
	}

	return (
		<div className={styles.container}>
			<header className={styles.header}>
				<div className={styles.headerTop}>
					<div className={styles.eyebrow}>
						{typeDef && <Icon name={typeDef.icon} size={14} />}
						{typeDef && <span className={styles.separator}>·</span>}
						<span>CATEGORY INDEX</span>
					</div>
					{creating ? (
						<div className={styles.addForm}>
							<input
								ref={inputRef}
								className={styles.addInput}
								value={newName}
								onChange={(e) => setNewName(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder={`New ${typeName}…`}
								disabled={createFolio.isPending}
							/>
							<button
								type="button"
								className={styles.addConfirm}
								onClick={handleCreateSubmit}
								disabled={!newName.trim() || createFolio.isPending}
							>
								↵
							</button>
							<button
								type="button"
								className={styles.addCancel}
								onClick={() => { setCreating(false); setNewName(''); }}
							>
								✕
							</button>
						</div>
					) : (
						<button className={styles.addBtn} onClick={() => { setNewName(''); setCreating(true); }}>+ ADD ENTRY</button>
					)}
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
