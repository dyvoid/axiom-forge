import type { ReactNode } from 'react';
import styles from './Callout.module.css';

interface CalloutProps {
	/** Short uppercase label naming what the notice is about. */
	label: string;
	/** `danger` (default) for a failure, `caution` for something to check. */
	tone?: 'danger' | 'caution';
	/**
	 * `alert` announces the notice the moment it appears: use it for the
	 * result of something the user just did. Leave it off for standing
	 * information that was there when the page loaded.
	 */
	role?: 'alert' | 'status';
	/** Outer spacing; the callout itself declares none. */
	className?: string;
	children: ReactNode;
}

export function Callout({ label, tone = 'danger', role, className, children }: CalloutProps): JSX.Element {
	const classes = [styles.callout, tone === 'caution' ? styles.caution : '', className ?? '']
		.filter(Boolean)
		.join(' ');
	return (
		<div className={classes} role={role}>
			<div className={styles.label}>{label}</div>
			<div className={styles.body}>{children}</div>
		</div>
	);
}
