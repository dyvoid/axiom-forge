import { EmptyState } from '../components/ui/EmptyState.js';
import styles from './NotFound.module.css';

export function NotFound(): JSX.Element {
	return (
		<div className={styles.container}>
			<span className={styles.code}>404</span>
			<EmptyState
				icon="search-x"
				title="Page not found"
				message="This page doesn't exist, or the link that brought you here may be broken."
				actionLabel="Return to Index"
				actionTo="/index"
			/>
		</div>
	);
}
