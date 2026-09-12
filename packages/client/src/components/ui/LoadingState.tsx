import styles from './LoadingState.module.css';

interface LoadingStateProps {
	/** Sentence-case, no trailing ellipsis -- this component adds the `…`. */
	message?: string;
}

/* Shared loading copy and treatment. Use this rather than restating the
   italic-muted recipe; FolioSkeleton keeps its own richer bones but borrows
   the same text treatment for its caption. */
export function LoadingState({ message = 'Loading' }: LoadingStateProps): JSX.Element {
	return (
		<p className={styles.block} role="status">
			{message}…
		</p>
	);
}
