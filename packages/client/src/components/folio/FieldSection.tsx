import { classifySection, isFieldValueEmpty } from '@axiom-forge/shared';
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
	const classified = classifySection(schema);

	switch (classified.kind) {
		case 'prose':
			return <ProseSection name={name} data={data} />;

		case 'links': {
			const links = (data.value as WikiLink[]) || [];
			if (links.length === 0) return <></>;
			return (
				<section className={styles.section}>
					<h2 className={styles.title}>{name}</h2>
					<div className={styles.wrap}>
						{links.map((link, i) => (
							<div key={i}>
								<FieldValueRenderer value={link} type="wikilink" />
							</div>
						))}
					</div>
				</section>
			);
		}

		case 'fields': {
			if (!data.fields) return <></>;

			const validFields = Object.entries(classified.fields)
				.filter(([fName]) => !isFieldValueEmpty(data.fields![fName]));

			if (validFields.length === 0) return <></>;

			return (
				<section className={styles.section}>
					<h2 className={styles.title}>{name}</h2>
					<div className={styles.wrap}>
						{validFields.map(([fName, fDef]) => (
							<div key={fName} className={styles.field}>
								<div className={styles.label}>{fName}</div>
								<div className={styles.value}>
									<FieldValueRenderer value={data.fields![fName]} type={fDef.type} />
								</div>
							</div>
						))}
					</div>
				</section>
			);
		}

		default: {
			const unhandled: never = classified;
			throw new Error(`Unhandled section kind: ${JSON.stringify(unhandled)}`);
		}
	}
}
