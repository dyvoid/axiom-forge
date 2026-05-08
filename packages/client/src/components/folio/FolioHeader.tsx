import { toRoman, type ParsedFolio } from '@axiom-forge/shared';
import { Icon } from '../ui/Icon.js';
import styles from './FolioHeader.module.css';

interface FolioHeaderProps {
	folio: ParsedFolio & { id: number };
	icon: string;
}

export function FolioHeader({ folio, icon }: FolioHeaderProps): JSX.Element {
	const basicInfo = folio.sections['Basic Information']?.fields;
	const dob = basicInfo?.['Date of Birth'];
	const dod = basicInfo?.['Date of Death'];
	const hasDates = dob || dod;

	// The subtitle isn't formalized in schema, but design uses it. We'll extract a hint from prose or use a placeholder if needed.
	const subtitle = folio.type === 'Character' ? 'of Kea, the mortal vessel of Ylverian' : null;

	return (
		<header className={styles.header}>
			<div className={styles.topRow}>
				<div className={styles.eyebrow}>
					<Icon name={icon} size={14} />
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
			{subtitle && <p className={styles.subtitle}>{subtitle}</p>}

			<div className={styles.metaRow}>
				{folio.status && (
					<span className={styles.statusPill}>{folio.status}</span>
				)}
				{hasDates && (
					<span className={styles.dateRange}>
						{dob || '?'} — {dod || '?'}
					</span>
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
