import { useEffect, useRef, useState } from 'react';
import styles from './fields.module.css';

interface Props {
	value: string;
	options: string[];
	onChange: (next: string) => void;
}

export function SelectField({ value, options, onChange }: Props): JSX.Element {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		function handleOutside(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		}
		document.addEventListener('mousedown', handleOutside);
		return () => document.removeEventListener('mousedown', handleOutside);
	}, []);

	return (
		<div ref={ref} className={styles.selectWrap}>
			<button
				type="button"
				className={`${styles.selectButton} ${open ? styles.open : ''}`}
				onClick={() => setOpen((o) => !o)}
			>
				<span>
					{value || <span className={styles.selectPlaceholder}>—</span>}
				</span>
				<span className={styles.selectArrow}>▾</span>
			</button>
			{open && (
				<div className={styles.menu}>
					{options.map((o) => (
						<div
							key={o}
							className={`${styles.menuItem} ${o === value ? styles.selected : ''}`}
							onClick={() => {
								onChange(o);
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
