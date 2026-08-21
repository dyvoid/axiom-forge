import { useId } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
	open: boolean;
	title: string;
	message: string;
	confirmLabel?: string;
	danger?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

export function ConfirmDialog({
	open,
	title,
	message,
	confirmLabel = 'Confirm',
	danger = false,
	onConfirm,
	onCancel,
}: ConfirmDialogProps): JSX.Element | null {
	const titleId = useId();
	const descId = useId();
	const containerRef = useFocusTrap<HTMLDivElement>(onCancel);

	if (!open) return null;

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
				<div className={styles.title} id={titleId}>{title}</div>
				<div className={styles.message} id={descId}>{message}</div>
				<div className={styles.actions}>
					<button type="button" className={styles.btnCancel} onClick={onCancel}>
						Cancel
					</button>
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
