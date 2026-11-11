import { useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useFolios } from '../../api/queries.js';
import { useProject } from '../../context/ProjectContext.js';
import { Icon } from '../ui/Icon.js';
import { EntryContent } from '../ui/EntryContent.js';
import { NewEntryButton } from '../ui/NewEntryButton.js';
import { TagFilter } from '../ui/TagFilter.js';
import { EmptyState } from '../ui/EmptyState.js';
import { LoadingState } from '../ui/LoadingState.js';
import { useTagFilterParams } from '../../hooks/useTagFilterParams.js';
import { collectTags, filterFolios } from '../../utils/filterFolios.js';
import { FolioEmptyState } from './FolioEmptyState.js';
import bar from '../ui/FilterBar.module.css';
import styles from './CategoryIndexView.module.css';

export function CategoryIndexView(): JSX.Element {
	const { folder } = useParams<{ folder: string }>();
	const { schemaIndex } = useProject();
	const { data: folios, isLoading } = useFolios();
	const [selectedTags, setSelectedTags] = useTagFilterParams();
	const [query, setQuery] = useState('');

	const categoryFolios = useMemo(() => folios?.filter((f) => f.folder === folder) ?? [], [folios, folder]);
	const allTags = useMemo(() => collectTags(categoryFolios), [categoryFolios]);
	const q = query.trim();

	// This view keeps the index's own order: it stays alphabetical, and search
	// only narrows it.
	const filteredFolios = useMemo(
		() => filterFolios({ folios: categoryFolios, query, tags: selectedTags, order: 'given' }),
		[categoryFolios, query, selectedTags],
	);

	if (isLoading) return <div className={styles.container}><LoadingState message="Loading index" /></div>;

	const typeName = folder && schemaIndex.typeKeyForFolder(folder);
	const typeDef = (folder && schemaIndex.typeDefForFolder(folder)) || null;
	// A folder no type owns. Rendering it as an empty category would offer a
	// "New entry" button that can only fail.
	if (!folder || !typeName) return <FolioEmptyState />;

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
					<NewEntryButton folder={folder} typeName={typeName} variant="outlined" />
				</div>
				<h1 className={styles.title}>{typeName}</h1>
				<div className={styles.meta}>
					{filteredFolios.length} {filteredFolios.length === 1 ? 'entry' : 'entries'}
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
							aria-label="Search this category"
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
								aria-label="Clear search"
							>
								<Icon name="x" size={16} />
							</button>
						)}
					</div>
					<div className={styles.tagFilterCol}>
						<TagFilter 
							availableTags={allTags}
							selectedTags={selectedTags}
							onChange={setSelectedTags}
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
						<Link key={f.id} to={`/folio/${encodeURIComponent(f.folder)}/${encodeURIComponent(f.name)}`} className={styles.entry}>
							<EntryContent folio={f} variant="row" />
						</Link>
					);
					})
				)}
			</div>
		</div>
	);
}
