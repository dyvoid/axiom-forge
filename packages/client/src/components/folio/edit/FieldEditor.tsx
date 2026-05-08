import type { FieldDef, FieldValue, WikiLink } from '@axiom-forge/shared';
import { TextField } from './TextField.js';
import { DateField } from './DateField.js';
import { TextareaField } from './TextareaField.js';
import { SelectField } from './SelectField.js';
import { MultiselectField } from './MultiselectField.js';
import { TextListField } from './TextListField.js';
import { WikilinkField } from './WikilinkField.js';
import { WikilinkListField } from './WikilinkListField.js';

interface Props {
	fieldDef: FieldDef;
	value: FieldValue;
	onChange: (next: FieldValue) => void;
}

function optionStrings(fieldDef: FieldDef): string[] {
	return (fieldDef.options ?? []).map((o) => (typeof o === 'string' ? o : o.value));
}

export function FieldEditor({ fieldDef, value, onChange }: Props): JSX.Element {
	switch (fieldDef.type) {
		case 'text':
			return (
				<TextField
					value={typeof value === 'string' ? value : ''}
					onChange={(v) => onChange(v || null)}
				/>
			);
		case 'date':
			return (
				<DateField
					value={typeof value === 'string' ? value : ''}
					onChange={(v) => onChange(v || null)}
				/>
			);
		case 'textarea':
			return (
				<TextareaField
					value={typeof value === 'string' ? value : ''}
					onChange={(v) => onChange(v || null)}
				/>
			);
		case 'select':
			return (
				<SelectField
					value={typeof value === 'string' ? value : ''}
					options={optionStrings(fieldDef)}
					onChange={(v) => onChange(v || null)}
				/>
			);
		case 'multiselect':
			return (
				<MultiselectField
					value={Array.isArray(value) ? (value as string[]) : []}
					options={optionStrings(fieldDef)}
					onChange={(v) => onChange(v.length ? v : null)}
				/>
			);
		case 'text-list':
			return (
				<TextListField
					value={Array.isArray(value) ? (value as string[]) : []}
					onChange={(v) => onChange(v.length ? v : null)}
				/>
			);
		case 'wikilink': {
			const link = value && !Array.isArray(value) && typeof value === 'object' ? (value as WikiLink) : null;
			return (
				<WikilinkField
					value={link}
					target={fieldDef.target}
					onChange={(v) => onChange(v)}
				/>
			);
		}
		case 'wikilink-list': {
			const links = Array.isArray(value) && value.length && typeof value[0] === 'object'
				? (value as WikiLink[])
				: [];
			return (
				<WikilinkListField
					value={links}
					target={fieldDef.target}
					onChange={(v) => onChange(v.length ? v : null)}
				/>
			);
		}
		default:
			return <TextField value={String(value ?? '')} onChange={(v) => onChange(v || null)} />;
	}
}
