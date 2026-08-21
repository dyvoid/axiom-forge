import { Link } from 'react-router-dom';
import type { WikiLink } from '@axiom-forge/shared';
import { useFolios } from '../../api/queries.js';
import { useProject } from '../../context/ProjectContext.js';
import { Icon } from '../ui/Icon.js';
import styles from './WikiLinkChip.module.css';

export function WikiLinkChip({ link }: { link: WikiLink }): JSX.Element {
	const { schema } = useProject();
	const { data: folios } = useFolios();
	
	const target = folios?.find(f => f.folder === link.folder && f.name === link.name);
	const isDead = !target;
	const display = link.alias || target?.title || link.name.replace(/_/g, ' ');

	// Determine icon based on the folder->type mapping
	const targetType = Object.entries(schema.types).find(([, def]) => def.folder === link.folder)?.[1];
	const iconName = targetType?.icon || 'circle';

	if (isDead) {
		return (
			<span
				className={`${styles.chip} ${styles.dead}`}
				tabIndex={0}
				role="link"
				aria-disabled="true"
				aria-label={`${display} — broken link: no folio at ${link.folder}/${link.name}`}
				title={`No folio at ${link.folder}/${link.name}`}
			>
				<Icon name={iconName} size={10} className={styles.icon} /> {display}
			</span>
		);
	}

	return (
		<Link
			to={`/folio/${link.folder}/${link.name}`}
			className={styles.chip}
		>
			<Icon name={iconName} size={10} className={styles.icon} /> {display}
		</Link>
	);
}
