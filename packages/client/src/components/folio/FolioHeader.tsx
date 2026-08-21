import { Link } from 'react-router-dom';
import { toRoman, type ParsedFolio } from '@axiom-forge/shared';
import { Icon } from '../ui/Icon.js';
import styles from './FolioHeader.module.css';

interface FolioHeaderProps {
	folio: ParsedFolio & { id: number };
	icon: string;
}

export function FolioHeader({ folio, icon }: FolioHeaderProps): JSX.Element {
	return (
		<header className={styles.header}>
			<div className={styles.topRow}>
				<nav className={styles.eyebrow} aria-label="Breadcrumb">
					<Link to="/index" className={styles.crumb}>Index</Link>
					<span className={styles.separator}>→</span>
					<Link
						className={styles.crumb}
						to={`/folio/${encodeURIComponent(folio.folder)}`}
					>
						<Icon name={icon} size={12} />
						{folio.type}
					</Link>
					<span className={styles.separator}>→</span>
					<span className={styles.crumbCurrent} aria-current="page">
						Folio {toRoman(folio.id)}
					</span>
				</nav>
				<div className={styles.actions}>
					<Link
						className={styles.editBtn}
						to={`/folio/${encodeURIComponent(folio.folder)}/${encodeURIComponent(folio.name)}/edit`}
					>
						Edit
					</Link>
				</div>
			</div>
			
			<h1 className={styles.title}>{folio.title}</h1>

			{folio.aliases && folio.aliases.length > 0 && (
				<p className={styles.aliases}>aka {folio.aliases.join(' · ')}</p>
			)}

			{folio.tags && folio.tags.length > 0 && (
				<nav className={styles.tags} aria-label="Tags">
					{folio.tags.map((tag) => (
						<Link key={tag} to={`/index?tags=${encodeURIComponent(tag)}`} className={styles.tag}>
							{tag}
						</Link>
					))}
				</nav>
			)}
		</header>
	);
}
