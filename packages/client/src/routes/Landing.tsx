/**
 * Landing route — project home page.
 * Phase 1: title block, description, type counts, "Enter the Archive" CTA.
 * WebGL hero will be layered in after we confirm the basics work.
 */

import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext.js';
import { useFolios } from '../api/queries.js';
import { Icon } from '../components/ui/Icon.js';
import styles from './Landing.module.css';

import { WebGLHero } from '../hero/WebGLHero.js';

export function Landing(): JSX.Element {
	const { config, schema } = useProject();
	const { data: folios } = useFolios();
	const navigate = useNavigate();

	// Count folios per type
	const typeCounts: Record<string, number> = {};
	if (folios) {
		for (const f of folios) {
			typeCounts[f.type] = (typeCounts[f.type] ?? 0) + 1;
		}
	}

	const totalEntries = folios?.length ?? 0;

	// Pick the first type with folios for "Enter the Archive"
	const firstType = Object.keys(schema.types)[0];
	const firstFolder = firstType ? schema.types[firstType]!.folder : '';

	function handleEnter() {
		// Navigate to the first folio of the first type, or just the archive root
		if (folios && folios.length > 0) {
			const first = folios[0]!;
			navigate(`/folio/${first.folder}/${first.name}`);
		}
	}

	return (
		<div className={styles.landing}>
			<WebGLHero variant="codex" />
			<div className={styles.topCorners}>
				<div className={styles.topLeft}>AXIOM · FORGE</div>
				<div className={styles.topRight}>VOL. I &nbsp; MMXXVI &nbsp; PRIVATE ARCHIVE</div>
			</div>
			<div className={styles.hero}>
				<div className={styles.titleBlock}>
					<h1 className={styles.title}>{config.name}</h1>
					<div className={styles.subtitleRow}>
						<div className={styles.line} />
						<p className={styles.subtitle}>
							{/* In a real app we might parse this from config tags, but for Phase 1 hardcode or use a simplified generic string */}
							BRONZE AGE · MINOAN / MYCENAEAN · {totalEntries} ENTRIES
						</p>
						<div className={styles.line} />
					</div>
					<button className={styles.cta} onClick={handleEnter}>
						ENTER THE ARCHIVE &nbsp; →
					</button>
				</div>
			</div>

			<footer className={styles.footer}>
				<span className={styles.footerLabel}>CONTENTS</span>
				<div className={styles.typeCounts}>
					{Object.entries(schema.types).map(([typeKey, typeDef]) => (
						<span key={typeKey} className={styles.typeEntry}>
							<Icon name={typeDef.icon} className={styles.typeIcon} size={12} />
							{typeKey} {typeCounts[typeKey] ?? 0}
						</span>
					))}
				</div>
				<span className={styles.pageNum}>I</span>
			</footer>
		</div>
	);
}
