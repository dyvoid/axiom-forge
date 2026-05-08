import type { FieldDef } from '@axiom-forge/shared';

interface Props {
	fieldDef: FieldDef;
}

/** Italic line shown below a field label, e.g. "wikilink → Locations". */
export function FieldTypeHint({ fieldDef }: Props): JSX.Element {
	let hint: string;
	switch (fieldDef.type) {
		case 'text':
			hint = 'text';
			break;
		case 'text-list':
			hint = 'text-list';
			break;
		case 'date':
			hint = 'date · freeform';
			break;
		case 'select':
			hint = 'select';
			break;
		case 'multiselect':
			hint = 'multiselect';
			break;
		case 'textarea':
			hint = 'prose · markdown';
			break;
		case 'wikilink':
			hint = `wikilink${fieldDef.target ? ` → ${fieldDef.target}` : ''}`;
			break;
		case 'wikilink-list':
			hint = `wikilink-list${fieldDef.target ? ` → ${fieldDef.target}` : ''}`;
			break;
		default:
			hint = String(fieldDef.type);
	}
	return (
		<div
			style={{
				fontSize: 10,
				color: 'var(--text-muted)',
				fontStyle: 'italic',
				marginTop: 2,
			}}
		>
			{hint}
		</div>
	);
}
