import { Link } from 'react-router-dom';
import { Icon } from './Icon.js';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
	icon?: string;
	title?: string;
	message: string;
	actionLabel?: string;
	actionTo?: string;
	/**
	 * `page` (default) is the full failure-mode treatment: large icon, italic
	 * title, action button. `inline` is the quieter one for "this list came
	 * back with nothing" inside a view that is otherwise fine -- a small icon
	 * and one muted line.
	 */
	variant?: 'page' | 'inline';
}

/* Shared "nothing here" visual. FolioEmptyState (missing folio, inside
   AppShell) and NotFound (unmatched route, full-viewport) render the same
   failure mode from the user's perspective and share the `page` variant so
   they don't drift the way they used to. The index views render the `inline`
   variant for empty result lists. Each caller owns only its outer
   layout/copy. */
export function EmptyState({
	icon,
	title,
	message,
	actionLabel,
	actionTo,
	variant = 'page',
}: EmptyStateProps): JSX.Element {
	const inline = variant === 'inline';
	return (
		<>
			{icon && (
				<div className={inline ? styles.iconInline : styles.icon}>
					<Icon name={icon} size={inline ? 20 : 48} strokeWidth={1} />
				</div>
			)}
			{title && <h2 className={inline ? styles.titleInline : styles.title}>{title}</h2>}
			<p className={inline ? styles.messageInline : styles.message}>{message}</p>
			{actionLabel && actionTo && (
				<Link to={actionTo} className={styles.actionBtn}>
					{actionLabel}
				</Link>
			)}
		</>
	);
}
