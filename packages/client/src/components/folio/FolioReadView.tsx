import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../../context/ProjectContext.js';
import type { ParsedFolio } from '@axiom-forge/shared';
import { FolioHeader } from './FolioHeader.js';
import { ProseSection } from './ProseSection.js';
import { MetaSection } from './MetaSection.js';
import { FieldSection } from './FieldSection.js';
import { BacklinksPanel } from './BacklinksPanel.js';
import styles from './FolioReadView.module.css';

interface FolioReadViewProps {
	folio: ParsedFolio & { id: number };
}

export function FolioReadView({ folio }: FolioReadViewProps): JSX.Element {
	const navigate = useNavigate();
	const { schema } = useProject();

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				e.key === 'e' && 
				document.activeElement?.tagName !== 'INPUT' && 
				document.activeElement?.tagName !== 'TEXTAREA'
			) {
				e.preventDefault();
				navigate(`/folio/${folio.folder}/${folio.name}/edit`);
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [navigate, folio.folder, folio.name]);

	const typeDef = schema.types[folio.type];

	if (!typeDef) {
		return <div>Unknown type: {folio.type}</div>;
	}

	// 1. Find roles
	let proseSectionName: string | undefined;
	let metaSectionName: string | undefined;

	for (const [sName, sDef] of Object.entries(typeDef.sections)) {
		if (sDef.role === 'prose') proseSectionName = sName;
		if (sDef.role === 'meta') metaSectionName = sName;
	}

	const hasProseData = proseSectionName && folio.sections[proseSectionName];
	const hasMetaData = metaSectionName && folio.sections[metaSectionName];

	// 2. Identify remaining sections
	const remainingSections = Object.entries(typeDef.sections).filter(
		([sName]) => sName !== proseSectionName && sName !== metaSectionName
	);

	return (
		<div className={styles.container}>
			<FolioHeader folio={folio} icon={typeDef.icon} />

			{(folio.warnings?.length ?? 0) > 0 && (
				<div className={styles.warnings}>
					<span className={styles.warningsLabel}>Schema warnings</span>
					<ul>
						{folio.warnings!.map((w, i) => <li key={i}>{w}</li>)}
					</ul>
				</div>
			)}

			{/* Top Block Layout */}
			{(hasProseData || hasMetaData) && (
				<>
					<div className={styles.divider} />
					<div className={styles.topBlock}>
						{hasProseData && (
							<div className={styles.proseCol}>
								<ProseSection 
									name={proseSectionName!} 
									data={folio.sections[proseSectionName!]!} 
									isDropCap 
								/>
							</div>
						)}
						{hasMetaData && (
							<div className={styles.metaCol}>
								<MetaSection 
									name={metaSectionName!} 
									data={folio.sections[metaSectionName!]!} 
									schema={typeDef.sections[metaSectionName!]!} 
								/>
							</div>
						)}
					</div>
					<div className={styles.divider} />
				</>
			)}

			{/* Remaining Sections (Full Width) */}
			<div className={styles.remaining}>
				{remainingSections.map(([sName, sDef]) => {
					const data = folio.sections[sName];
					if (!data) return null;
					return (
						<FieldSection 
							key={sName} 
							name={sName} 
							data={data} 
							schema={sDef} 
						/>
					);
				})}
			</div>

			<BacklinksPanel folder={folio.folder} name={folio.name} />
		</div>
	);
}
