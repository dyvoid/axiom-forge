import type { SectionDef, ParsedSection, WikiLink } from '@axiom-forge/shared';
import { WikiLinkChip } from '../ui/WikiLinkChip.js';
import styles from './MetaSection.module.css';

interface MetaSectionProps {
	name: string;
	schema: SectionDef;
	data: ParsedSection;
}

export function MetaSection({ name, schema, data }: MetaSectionProps): JSX.Element {
	if (!data.fields) return <></>;

	const validFields = Object.entries(schema.fields || {}).filter(([fName]) => {
		const val = data.fields![fName];
		if (val === undefined || val === null || val === '') return false;
		if (Array.isArray(val) && val.length === 0) return false;
		return true;
	});

	if (validFields.length === 0) return <></>;

	return (
		<section className={styles.section}>
			<h2 className={styles.title}>{name}</h2>
			<div className={styles.box}>
				{validFields.map(([fName, fDef]) => {
					const val = data.fields![fName];

					const isList = ['text-list', 'wikilink-list', 'multiselect'].includes(fDef.type);
					const hasMultipleItems = Array.isArray(val) && val.length > 1;
					const className = (isList && hasMultipleItems) ? styles.fieldStacked : styles.field;

					return (
						<div key={fName} className={className}>
							<div className={styles.label}>{fName}</div>
							<div className={styles.value}>
								<FieldValueRenderer value={val} type={fDef.type} />
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}

export function FieldValueRenderer({ value, type }: { value: unknown; type: string }): JSX.Element {
	if (type === 'wikilink') {
		return <WikiLinkChip link={value as WikiLink} />;
	}
	if (type === 'wikilink-list') {
		return (
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
				{(value as WikiLink[]).map((link, i) => (
					<WikiLinkChip key={i} link={link} />
				))}
			</div>
		);
	}
	if (type === 'text-list' || type === 'multiselect') {
		return (
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
				{(value as string[]).map((item, i) => (
					<span key={i} className={styles.textChip}>{item}</span>
				))}
			</div>
		);
	}
	return <span>{String(value)}</span>;
}
