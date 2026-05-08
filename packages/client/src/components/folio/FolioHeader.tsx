import { toRoman, type ParsedFolio } from '@axiom-forge/shared';
import { Icon } from '../ui/Icon.js';
import styles from './FolioHeader.module.css';

interface FolioHeaderProps {
	folio: ParsedFolio & { id: number };
	icon: string;
}

export function FolioHeader({ folio, icon }: FolioHeaderProps): JSX.Element {
	const subtitle = folio.sections['Description & History']?.content?.split('\n')[0] || '';
	// Actually, the spec mockups show an italic subtitle that isn't explicitly
	// part of the schema, but could be inferred or missing. Wait, let's look at the plan.
	// `01_Data_Model.md` says "Folio italic subtitle (`of Kea, the mortal vessel of Ylverian`)".
	// It's not a field. Maybe we just omit the subtitle for now if it's not in the data, 
	// or we can just render the name. Let's stick to the H1 and eyebrow.

	return (
		<header className={styles.header}>
			<div className={styles.topRow}>
				<div className={styles.eyebrow}>
					<Icon name={icon} />
					<span className={styles.separator}>·</span>
					<span>{folio.type}</span>
					<span className={styles.separator}>·</span>
					<span>Folio {toRoman(folio.id)}</span>
				</div>
				<div className={styles.actions}>
					<button className={styles.actionBtn}>Edit</button>
					<span className={styles.separator}>·</span>
					<button className={styles.actionBtn}>Backlinks</button>
					<span className={styles.separator}>·</span>
					<button className={styles.actionBtn}>···</button>
				</div>
			</div>
			
			<h1 className={styles.title}>{folio.name.replace(/_/g, ' ')}</h1>

			<div className={styles.metaRow}>
				{folio.status && (
					<span className={styles.statusPill}>{folio.status}</span>
				)}
				{folio.tags && folio.tags.length > 0 && (
					<div className={styles.tags}>
						{folio.tags.map((tag) => (
							<span key={tag} className={styles.tag}>
								{tag}
							</span>
						))}
					</div>
				)}
			</div>
		</header>
	);
}
