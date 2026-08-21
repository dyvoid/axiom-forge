import { EmptyState } from '../ui/EmptyState.js';
import styles from './FolioEmptyState.module.css';

export function FolioEmptyState(): JSX.Element {
	return (
		<div className={styles.container}>
			<EmptyState
				icon="search-x"
				title="Folio not found"
				message="This folio does not exist in the manuscript, or it may have been moved."
				actionLabel="Return to Index"
				actionTo="/index"
			/>
		</div>
	);
}
