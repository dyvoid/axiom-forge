import { useEffect, useRef, useState } from 'react';
import styles from './fields.module.css';

interface Props {
	value: string[];
	options: string[];
	onChange: (next: string[]) => void;
	ariaLabel?: string;
}

export function MultiselectField({ value, options, onChange, ariaLabel }: Props): JSX.Element {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		function handleOutside(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		}
		document.addEventListener('mousedown', handleOutside);
		return () => document.removeEventListener('mousedown', handleOutside);
	}, []);

	const remaining = options.filter((o) => !value.includes(o));

	return (
		<div ref={ref} className={styles.selectWrap}>
			<div className={styles.tagBox} role="group" aria-label={ariaLabel}>
				{value.map((item, i) => (
					<span key={item} className={styles.chip}>
						{item}
						<button
							type="button"
							className={styles.chipRemove}
							aria-label={`Remove ${item}`}
							onClick={() => onChange(value.filter((_, x) => x !== i))}
						>
							×
						</button>
					</span>
				))}
				{remaining.length > 0 && (
					<button
						type="button"
						className={styles.addBtn}
						aria-expanded={open}
						aria-haspopup="listbox"
						onClick={() => setOpen((o) => !o)}
					>
						+ add
					</button>
				)}
			</div>
			{open && remaining.length > 0 && (
				<div className={styles.menu} role="listbox">
					{remaining.map((o) => (
						<div
							key={o}
							role="option"
							aria-selected={false}
							className={styles.menuItem}
							onClick={() => {
								onChange([...value, o]);
								setOpen(false);
							}}
						>
							{o}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
