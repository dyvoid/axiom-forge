import { useId, useState } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
	open: boolean;
	title: string;
	message: string;
	confirmLabel?: string;
	secondaryLabel?: string;
	danger?: boolean;
	/**
	 * Text the user must type, exactly, before the confirm button enables.
	 * For the rare action that cannot be undone and reaches far: say what to
	 * type in the message, and what it is in `requireTextLabel`.
	 */
	requireText?: string;
	requireTextLabel?: string;
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
	requireText,
	requireTextLabel = 'Type to confirm',
	onConfirm,
	onSecondary,
	onCancel,
}: Omit<ConfirmDialogProps, 'open'>): JSX.Element {
	const titleId = useId();
	const descId = useId();
	const inputId = useId();
	const containerRef = useFocusTrap<HTMLDivElement>(onCancel);
	const [typed, setTyped] = useState('');
	const confirmed = requireText === undefined || typed.trim() === requireText;

	return (
		<div className={styles.overlay} onClick={onCancel}>
			<div
				ref={containerRef}
				className={secondaryLabel && onSecondary ? styles.dialogWide : styles.dialog}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={descId}
				onClick={(e) => e.stopPropagation()}
			>
				<h2 className={styles.title} id={titleId}>{title}</h2>
				<div className={styles.message} id={descId}>{message}</div>
				{requireText !== undefined && (
					<div className={styles.requireText}>
						<label className={styles.requireTextLabel} htmlFor={inputId}>{requireTextLabel}</label>
						<input
							id={inputId}
							className={styles.requireTextInput}
							value={typed}
							onChange={(e) => setTyped(e.target.value)}
							onKeyDown={(e) => { if (e.key === 'Enter' && confirmed) onConfirm(); }}
							autoComplete="off"
							spellCheck={false}
						/>
					</div>
				)}
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
						disabled={!confirmed}
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
