import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './NewEntryButton.module.css';

interface Props {
	/** Folder the new folio is created in. */
	folder: string;
	/** Type name used in the field's placeholder, e.g. "Human". */
	typeName?: string;
	/**
	 * Button prominence. `ghost` is a tertiary affordance (sidebar nav foot);
	 * `outlined` is a page-header primary action. The form is identical.
	 */
	variant?: 'ghost' | 'outlined';
}

/**
 * The create-entry affordance: a button that swaps in place for a name field.
 * Enter commits, Escape or a click outside collapses it.
 *
 * Nothing is written to disk here — it opens the editor on an unsaved draft,
 * and the folio is created on save.
 */
export function NewEntryButton({ folder, typeName, variant = 'ghost' }: Props): JSX.Element {
	const navigate = useNavigate();
	const [creating, setCreating] = useState(false);
	const [name, setName] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);
	const formRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (creating) inputRef.current?.focus();
	}, [creating]);

	// Collapse the form back to the button when a click lands outside it.
	// Capture phase, so it runs before a click elsewhere navigates away; the
	// confirm and cancel buttons live inside the form and so do not trigger it.
	useEffect(() => {
		if (!creating) return;
		function handlePointerDown(e: PointerEvent): void {
			if (!formRef.current?.contains(e.target as Node)) {
				setCreating(false);
				setName('');
			}
		}
		window.addEventListener('pointerdown', handlePointerDown, true);
		return () => window.removeEventListener('pointerdown', handlePointerDown, true);
	}, [creating]);

	function submit(): void {
		const trimmed = name.trim();
		if (!trimmed) return;
		setCreating(false);
		setName('');
		navigate(`/new/${encodeURIComponent(folder)}?title=${encodeURIComponent(trimmed)}`);
	}

	if (!creating) {
		return (
			<button
				type="button"
				className={variant === 'outlined' ? styles.outlined : styles.ghost}
				onClick={() => { setName(''); setCreating(true); }}
			>
				+ New entry
			</button>
		);
	}

	return (
		<div
			ref={formRef}
			className={`${styles.form} ${variant === 'outlined' ? styles.formOutlined : ''}`}
		>
			<input
				ref={inputRef}
				className={styles.input}
				value={name}
				onChange={(e) => setName(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === 'Enter') submit();
					if (e.key === 'Escape') { setCreating(false); setName(''); }
				}}
				placeholder={`New ${typeName || 'entry'}…`}
				aria-label={`New ${typeName || 'entry'} name`}
			/>
			<button
				type="button"
				className={styles.confirm}
				onClick={submit}
				disabled={!name.trim()}
				aria-label="Create entry"
			>
				↵
			</button>
			<button
				type="button"
				className={styles.cancel}
				onClick={() => { setCreating(false); setName(''); }}
				aria-label="Cancel"
			>
				✕
			</button>
		</div>
	);
}
