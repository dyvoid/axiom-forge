import type { SectionDef, ParsedSection, WikiLink } from '@axiom-forge/shared';
import { FieldValueRenderer } from './MetaSection.js';
import { ProseSection } from './ProseSection.js';
import styles from './FieldSection.module.css';

interface FieldSectionProps {
	name: string;
	schema: SectionDef;
	data: ParsedSection;
}

export function FieldSection({ name, schema, data }: FieldSectionProps): JSX.Element {
	// If it's a section-level value (e.g. textarea, wikilink-list)
	if (!schema.fields) {
		if (schema.type === 'textarea') {
			return <ProseSection name={name} data={data} />;
		}
		if (schema.type === 'wikilink-list') {
			const links = (data.value as WikiLink[]) || [];
			if (links.length === 0) return <></>;
			return (
				<section className={styles.section}>
					<h2 className={styles.title}>{name}</h2>
					<div className={styles.grid}>
						{links.map((link, i) => (
							<div key={i}>
								<FieldValueRenderer value={link} type="wikilink" />
							</div>
						))}
					</div>
				</section>
			);
		}
		return <></>;
	}

	// Structured field section (like "Relationships")
	if (!data.fields) return <></>;

	return (
		<section className={styles.section}>
			<h2 className={styles.title}>{name}</h2>
			<div className={styles.grid}>
				{Object.entries(schema.fields).map(([fName, fDef]) => {
					const val = data.fields![fName];
					if (val === undefined || val === null || val === '') return null;
					if (Array.isArray(val) && val.length === 0) return null;

					return (
						<div key={fName} className={styles.field}>
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
