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
				<div className={styles.eyebrow}>
					<Icon name={icon} size={14} />
					<span className={styles.separator}>·</span>
					<span>{folio.type}</span>
					<span className={styles.separator}>·</span>
					<span>Folio {toRoman(folio.id)}</span>
				</div>
				<div className={styles.actions}>
					<Link
						className={styles.actionBtn}
						to={`/folio/${encodeURIComponent(folio.folder)}/${encodeURIComponent(folio.name)}/edit`}
					>
						Edit
					</Link>
					<span className={styles.separator}>·</span>
					<button className={styles.actionBtn}>Backlinks</button>
					<span className={styles.separator}>·</span>
					<button className={styles.actionBtn}>···</button>
				</div>
			</div>
			
			<h1 className={styles.title}>{folio.title}</h1>

			<div className={styles.metaRow}>
				{folio.status && (
					<span className={styles.statusPill}>{folio.status}</span>
				)}
				{folio.tags && folio.tags.length > 0 && (
					<div className={styles.tags}>
						{folio.tags.map((tag) => (
							<span key={tag} className={styles.tag}>
								{tag}
							</span>
						))}
					</div>
				)}
			</div>
		</header>
	);
}
