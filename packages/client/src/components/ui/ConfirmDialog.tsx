import { useId } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
	open: boolean;
	title: string;
	message: string;
	confirmLabel?: string;
	secondaryLabel?: string;
	danger?: boolean;
	onConfirm: () => void;
	onSecondary?: () => void;
	onCancel: () => void;
}

export function ConfirmDialog({ open, ...panel }: ConfirmDialogProps): JSX.Element | null {
	return open ? <ConfirmDialogPanel {...panel} /> : null;
}

/** The open dialog. Its own component so the focus trap mounts and unmounts with it. */
function ConfirmDialogPanel({
	title,
	message,
	confirmLabel = 'Confirm',
	secondaryLabel,
	danger = false,
	onConfirm,
	onSecondary,
	onCancel,
}: Omit<ConfirmDialogProps, 'open'>): JSX.Element {
	const titleId = useId();
	const descId = useId();
	const containerRef = useFocusTrap<HTMLDivElement>(onCancel);

	return (
		<div className={styles.overlay} onClick={onCancel}>
			<div
				ref={containerRef}
				className={styles.dialog}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={descId}
				onClick={(e) => e.stopPropagation()}
			>
				<h2 className={styles.title} id={titleId}>{title}</h2>
				<div className={styles.message} id={descId}>{message}</div>
				<div className={styles.actions}>
					<button type="button" className={styles.btnCancel} onClick={onCancel}>
						Cancel
					</button>
					{secondaryLabel && onSecondary && (
						<button type="button" className={styles.btnCancel} onClick={onSecondary}>
							{secondaryLabel}
						</button>
					)}
					<button
						type="button"
						className={`${styles.btnConfirm} ${danger ? styles.danger : ''}`}
						onClick={onConfirm}
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
