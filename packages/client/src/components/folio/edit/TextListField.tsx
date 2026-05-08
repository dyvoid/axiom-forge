import { useState } from 'react';
import styles from './fields.module.css';

interface Props {
	value: string[];
	onChange: (next: string[]) => void;
	placeholder?: string;
}

export function TextListField({ value, onChange, placeholder }: Props): JSX.Element {
	const [draft, setDraft] = useState('');

	function commit(): void {
		const trimmed = draft.trim();
		if (!trimmed) return;
		onChange([...value, trimmed]);
		setDraft('');
	}

	return (
		<div className={styles.tagBox}>
			{value.map((item, i) => (
				<span key={`${item}-${i}`} className={styles.chip}>
					{item}
					<button
						type="button"
						className={styles.chipRemove}
						onClick={() => onChange(value.filter((_, x) => x !== i))}
					>
						×
					</button>
				</span>
			))}
			<input
				className={styles.tagInput}
				value={draft}
				placeholder={placeholder ?? (value.length === 0 ? 'add value, press ↵' : 'add…')}
				onChange={(e) => setDraft(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ',') {
						e.preventDefault();
						commit();
					} else if (e.key === 'Backspace' && !draft && value.length) {
						onChange(value.slice(0, -1));
					}
				}}
				onBlur={commit}
			/>
		</div>
	);
}
