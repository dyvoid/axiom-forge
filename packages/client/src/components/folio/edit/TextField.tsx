import styles from './fields.module.css';

interface Props {
	value: string;
	onChange: (next: string) => void;
	placeholder?: string;
}

export function TextField({ value, onChange, placeholder }: Props): JSX.Element {
	return (
		<input
			type="text"
			className={styles.input}
			value={value}
			placeholder={placeholder}
			onChange={(e) => onChange(e.target.value)}
		/>
	);
}
