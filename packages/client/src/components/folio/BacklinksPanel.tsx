import { Link } from 'react-router-dom';
import { useBacklinks } from '../../api/queries.js';
import styles from './BacklinksPanel.module.css';

interface BacklinksPanelProps {
	folder: string;
	name: string;
}

export function BacklinksPanel({ folder, name }: BacklinksPanelProps): JSX.Element | null {
	const { data: backlinks, isLoading } = useBacklinks(folder, name);

	if (isLoading || !backlinks || backlinks.length === 0) {
		return null;
	}

	return (
		<div className={styles.panel}>
			<h3 className={styles.header}>Linked Mentions</h3>
			<div className={styles.grid}>
				{backlinks.map((link) => (
					<Link
						key={`${link.folder}/${link.name}`}
						to={`/folio/${encodeURIComponent(link.folder)}/${encodeURIComponent(link.name)}`}
						className={styles.card}
					>
						<div className={styles.cardHeader}>
							<span className={styles.cardTitle}>{link.title}</span>
							<span className={styles.cardFolder}>{link.folder}</span>
						</div>
						{link.aliases && link.aliases.length > 0 && (
							<div className={styles.cardAliases}>aka {link.aliases.join(' · ')}</div>
						)}
						{link.snippet && (
							<div className={styles.cardSnippet}>{link.snippet}</div>
						)}
					</Link>
				))}
			</div>
		</div>
	);
}
