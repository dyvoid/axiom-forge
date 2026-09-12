import { ChipField } from '../../ui/ChipField.js';

interface Props {
	value: string[];
	onChange: (next: string[]) => void;
	placeholder?: string;
	suggestions?: string[];
	ariaLabel?: string;
}

export function TextListField({ value, onChange, placeholder, suggestions, ariaLabel }: Props): JSX.Element {
	const available = (suggestions ?? []).filter((s) => !value.includes(s));

	function add(text: string): void {
		if (!value.includes(text)) onChange([...value, text]);
	}

	return (
		<ChipField
			chips={value.map((item) => ({ id: item, label: item }))}
			options={available.map((item) => ({ id: item, label: item }))}
			onAdd={(option) => add(option.id)}
			onAddRaw={add}
			onRemove={(id) => onChange(value.filter((item) => item !== id))}
			placeholder={placeholder}
			ariaLabel={ariaLabel}
		/>
	);
}
