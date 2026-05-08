import { TextField } from './TextField.js';

interface Props {
	value: string;
	onChange: (next: string) => void;
}

export function DateField({ value, onChange }: Props): JSX.Element {
	return <TextField value={value} onChange={onChange} placeholder="freeform · e.g. 1502 BCE" />;
}
