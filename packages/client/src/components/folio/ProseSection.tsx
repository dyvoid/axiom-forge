import type { ParsedSection } from '@axiom-forge/shared';
import { renderMarkdown } from '../../utils/markdown.js';
import styles from './ProseSection.module.css';

interface ProseSectionProps {
	name: string;
	data: ParsedSection;
	isDropCap?: boolean;
}

export function ProseSection({ name, data, isDropCap }: ProseSectionProps): JSX.Element {
	if (!data.content) return <></>;

	return (
		<section className={styles.section}>
			<h2 className={styles.title}>{name}</h2>
			<div
				className={styles.content}
				dangerouslySetInnerHTML={{ __html: renderMarkdown(data.content, isDropCap) }}
			/>
		</section>
	);
}
