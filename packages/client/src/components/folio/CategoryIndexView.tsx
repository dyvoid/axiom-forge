import { useRef, useState, useEffect, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useFolios, useCreateFolio } from '../../api/queries.js';
import { useProject } from '../../context/ProjectContext.js';
import { Icon } from '../ui/Icon.js';
import { TagFilter } from '../ui/TagFilter.js';
import bar from '../ui/FilterBar.module.css';
import styles from './CategoryIndexView.module.css';

export function CategoryIndexView(): JSX.Element {
	const { folder } = useParams<{ folder: string }>();
	const { schema } = useProject();
	const { data: folios, isLoading } = useFolios();
	const createFolio = useCreateFolio();
	const [creating, setCreating] = useState(false);
	const [newName, setNewName] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);
	const [searchParams, setSearchParams] = useSearchParams();
	const [query, setQuery] = useState('');

	useEffect(() => {
		if (creating) inputRef.current?.focus();
	}, [creating]);

	const categoryFolios = folios?.filter(f => f.folder === folder) ?? [];
	
	const allTags = Array.from(new Set(categoryFolios.flatMap(f => f.tags || []))).sort();
	const selectedTags = searchParams.get('tags')?.split(',').filter(Boolean) || [];

	const handleTagsChange = (tags: string[]) => {
		const newParams = new URLSearchParams(searchParams);
		if (tags.length > 0) {
			newParams.set('tags', tags.join(','));
		} else {
			newParams.delete('tags');
		}
		setSearchParams(newParams);
	};

	const q = query.trim().toLowerCase();

	const scoredFolios = useMemo(() => {
		if (!categoryFolios.length) return [];
		return categoryFolios.map(f => {
			if (!q) return { folio: f, score: 0 };
			const title = f.title.toLowerCase();
			const name = f.name.replace(/_/g, ' ').toLowerCase();
			const snippet = (f.snippet || '').toLowerCase();
			
			let score = 0;
			if (title === q || name === q) score += 100;
			else if (title.startsWith(q) || name.startsWith(q)) score += 50;
			else if (title.includes(q) || name.includes(q)) score += 10;
			if (snippet.includes(q)) score += 1;
			
			return { folio: f, score };
		});
	}, [categoryFolios, q]);

	const queryFiltered = scoredFolios
		.filter(sf => sf.score >= 0 && (q ? sf.score > 0 : true))
		.map(sf => sf.folio);

	const filteredFolios = selectedTags.length > 0
		? queryFiltered.filter(f => selectedTags.every(t => f.tags?.includes(t)))
		: queryFiltered;

	if (isLoading) return <div className={styles.container}>Loading index...</div>;

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
			name: '',
			title: trimmed,
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
					{filteredFolios.length} {filteredFolios.length === 1 ? 'ENTRY' : 'ENTRIES'}
				</div>
				<div className={styles.filterRow}>
					{/* Search bar — uses the shared FilterBar classes */}
					<div className={bar.bar}>
						<span className={bar.icon}>
							<Icon name="search" size={18} />
						</span>
						<input
							type="text"
							placeholder="Search the index..."
							className={bar.input}
							value={query}
							onChange={(e) => setQuery(e.target.value)}
						/>
						{query && (
							<button
								type="button"
								className={bar.clearBtn}
								onClick={(e) => {
									e.stopPropagation();
									setQuery('');
								}}
								title="Clear search"
							>
								<Icon name="x" size={16} />
							</button>
						)}
					</div>
					<div style={{ flex: 1 }}>
						<TagFilter 
							availableTags={allTags}
							selectedTags={selectedTags}
							onChange={handleTagsChange}
						/>
					</div>
				</div>
			</header>

			<div className={styles.list}>
				{filteredFolios.length === 0 ? (
					<div className={styles.empty}>No entries yet.</div>
				) : (
					filteredFolios.map(f => {
						return (
						<Link key={f.id} to={`/folio/${f.folder}/${f.name}`} className={styles.entry}>
							<span className={styles.name}>
								{f.title}
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
