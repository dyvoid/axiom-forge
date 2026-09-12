import { useState, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { scoreFolio } from '@axiom-forge/shared';
import { useFolios } from '../../api/queries.js';
import { useProject } from '../../context/ProjectContext.js';
import { Icon } from '../ui/Icon.js';
import { EntryContent } from '../ui/EntryContent.js';
import { NewEntryButton } from '../ui/NewEntryButton.js';
import { TagFilter } from '../ui/TagFilter.js';
import { EmptyState } from '../ui/EmptyState.js';
import { LoadingState } from '../ui/LoadingState.js';
import bar from '../ui/FilterBar.module.css';
import styles from './CategoryIndexView.module.css';

export function CategoryIndexView(): JSX.Element {
	const { folder } = useParams<{ folder: string }>();
	const { schemaIndex } = useProject();
	const { data: folios, isLoading } = useFolios();
	const [searchParams, setSearchParams] = useSearchParams();
	const [query, setQuery] = useState('');

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

	// Ranking is shared with the server and the Grand Index (ADR-0011). This view
	// keeps its own ordering: the index stays alphabetical, search only narrows it.
	const queryFiltered = useMemo(
		() => (q ? categoryFolios.filter((f) => scoreFolio(f, q) > 0) : categoryFolios),
		[categoryFolios, q],
	);

	const filteredFolios = selectedTags.length > 0
		? queryFiltered.filter(f => selectedTags.every(t => f.tags?.includes(t)))
		: queryFiltered;

	if (isLoading) return <div className={styles.container}><LoadingState message="Loading index" /></div>;

	const typeName = (folder && schemaIndex.typeKeyForFolder(folder)) || folder;
	const typeDef = (folder && schemaIndex.typeDefForFolder(folder)) || null;

	return (
		<div className={styles.container}>
			<header className={styles.header}>
				<div className={styles.headerTop}>
					<nav className={styles.eyebrow} aria-label="Breadcrumb">
						<Link to="/index" className={styles.crumb}>Index</Link>
						<span className={styles.separator}>→</span>
						<span className={styles.crumbCurrent} aria-current="page">
							{typeDef && <Icon name={typeDef.icon} size={12} />}
							{typeName}
						</span>
					</nav>
					{folder && (
						<NewEntryButton folder={folder} typeName={typeName} variant="outlined" />
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
							placeholder="Search the index…"
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
					<div className={styles.tagFilterCol}>
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
					<div className={styles.empty}>
						{q || selectedTags.length > 0 ? (
							<EmptyState
								variant="inline"
								icon="search-x"
								message="No results found. Try a different search, or clear the tag filter."
							/>
						) : (
							<EmptyState
								variant="inline"
								icon={typeDef?.icon || 'circle'}
								message={`No ${typeName} entries yet. Create the first one above.`}
							/>
						)}
					</div>
				) : (
					filteredFolios.map(f => {
						return (
						<Link key={f.id} to={`/folio/${f.folder}/${f.name}`} className={styles.entry}>
							<EntryContent folio={f} variant="row" />
						</Link>
					);
					})
				)}
			</div>
		</div>
	);
}
