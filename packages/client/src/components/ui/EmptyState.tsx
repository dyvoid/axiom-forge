import { Link } from 'react-router-dom';
import { Icon } from './Icon.js';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
	icon: string;
	title: string;
	message: string;
	actionLabel: string;
	actionTo: string;
}

/* Shared "nothing here" visual: icon, italic title, muted message, bordered
   action button. FolioEmptyState (missing folio, inside AppShell) and
   NotFound (unmatched route, full-viewport) render the same failure mode
   from the user's perspective and share this so they don't drift the way
   they used to -- each owns only its outer layout/copy. */
export function EmptyState({ icon, title, message, actionLabel, actionTo }: EmptyStateProps): JSX.Element {
	return (
		<>
			<div className={styles.icon}>
				<Icon name={icon} size={48} strokeWidth={1} />
			</div>
			<h2 className={styles.title}>{title}</h2>
			<p className={styles.message}>{message}</p>
			<Link to={actionTo} className={styles.actionBtn}>
				{actionLabel}
			</Link>
		</>
	);
}
