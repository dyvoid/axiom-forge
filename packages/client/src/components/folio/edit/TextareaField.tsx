import styles from './fields.module.css';

interface Props {
	value: string;
	onChange: (next: string) => void;
	placeholder?: string;
}

export function TextareaField({ value, onChange, placeholder }: Props): JSX.Element {
	return (
		<textarea
			className={styles.textarea}
			value={value}
			placeholder={placeholder}
			onChange={(e) => onChange(e.target.value)}
		/>
	);
}
