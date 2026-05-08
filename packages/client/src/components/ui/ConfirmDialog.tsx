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
	if (!open) return null;

	return (
		<div className={styles.overlay} onClick={onCancel}>
			<div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
				<div className={styles.title}>{title}</div>
				<div className={styles.message}>{message}</div>
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
