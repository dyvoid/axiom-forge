import { Link } from 'react-router-dom';
import { useBacklinks } from '../../api/queries.js';
import { EntryContent } from '../ui/EntryContent.js';
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
						<EntryContent folio={link} variant="card" />
					</Link>
				))}
			</div>
		</div>
	);
}
