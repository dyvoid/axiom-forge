import type { ParsedSection } from '@axiom-forge/shared';
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
			<div className={styles.content}>
				{data.content.split('\n\n').map((paragraph, i) => (
					<p key={i} className={i === 0 && isDropCap ? 'prose-drop-cap' : ''}>
						{paragraph}
					</p>
				))}
			</div>
		</section>
	);
}
