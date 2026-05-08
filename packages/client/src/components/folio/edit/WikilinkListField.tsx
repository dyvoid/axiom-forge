import type { WikiLink } from '@axiom-forge/shared';
import { useState } from 'react';
import styles from './fields.module.css';

interface Props {
	value: WikiLink[];
	target?: string;
	onChange: (next: WikiLink[]) => void;
}

/**
 * M1 stub: wikilinks as plain text chips. Type "Folder/Name" or "Name"
 * (using the target folder as default), Enter to commit.
 * Replaced by the autocomplete picker in M3.
 */
export function WikilinkListField({ value, target, onChange }: Props): JSX.Element {
	const [draft, setDraft] = useState('');
	const folder = target ?? '';

	function commit(): void {
		const trimmed = draft.trim();
		if (!trimmed) return;
		const slashIdx = trimmed.indexOf('/');
		const link: WikiLink =
			slashIdx === -1
				? { folder, name: trimmed.replace(/\s+/g, '_') }
				: { folder: trimmed.slice(0, slashIdx), name: trimmed.slice(slashIdx + 1).replace(/\s+/g, '_') };
		onChange([...value, link]);
		setDraft('');
	}

	return (
		<div className={styles.tagBox}>
			{value.map((link, i) => (
				<span key={`${link.folder}/${link.name}-${i}`} className={styles.chip}>
					{link.folder}/{link.name.replace(/_/g, ' ')}
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
				placeholder={folder ? `${folder}/Name` : 'Folder/Name'}
				onChange={(e) => setDraft(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === 'Enter') {
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
