import styles from './fields.module.css';

interface Props {
	value: string;
	onChange: (next: string) => void;
	placeholder?: string;
	ariaLabel?: string;
}

export function TextField({ value, onChange, placeholder, ariaLabel }: Props): JSX.Element {
	return (
		<input
			type="text"
			className={styles.input}
			value={value}
			placeholder={placeholder}
			aria-label={ariaLabel}
			onChange={(e) => onChange(e.target.value)}
		/>
	);
}
