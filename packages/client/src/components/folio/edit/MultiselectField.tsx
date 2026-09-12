import { ChipField } from '../../ui/ChipField.js';

interface Props {
	value: string[];
	options: string[];
	onChange: (next: string[]) => void;
	ariaLabel?: string;
}

export function MultiselectField({ value, options, onChange, ariaLabel }: Props): JSX.Element {
	const remaining = options.filter((o) => !value.includes(o));

	// No `onAddRaw`: the schema defines the full vocabulary, so typing filters
	// rather than creating.
	return (
		<ChipField
			chips={value.map((item) => ({ id: item, label: item }))}
			options={remaining.map((item) => ({ id: item, label: item }))}
			onAdd={(option) => onChange([...value, option.id])}
			onRemove={(id) => onChange(value.filter((item) => item !== id))}
			ariaLabel={ariaLabel}
		/>
	);
}
