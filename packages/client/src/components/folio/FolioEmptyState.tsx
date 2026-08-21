import { Link } from 'react-router-dom';
import { Icon } from '../ui/Icon.js';
import styles from './FolioEmptyState.module.css';

export function FolioEmptyState(): JSX.Element {
	return (
		<div className={styles.container}>
			<div className={styles.icon}>
				<Icon name="search-x" size={48} strokeWidth={1} />
			</div>
			<h2 className={styles.title}>Folio not found</h2>
			<p className={styles.message}>
				This folio does not exist in the manuscript, or it may have been moved.
			</p>
			<Link to="/index" className={styles.homeBtn}>
				Return to Index
			</Link>
		</div>
	);
}
