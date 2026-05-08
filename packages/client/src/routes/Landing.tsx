/**
 * Landing route — project home page.
 * Phase 1: title block, description, type counts, "Enter the Archive" CTA.
 * WebGL hero will be layered in after we confirm the basics work.
 */

import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext.js';
import { useFolios } from '../api/queries.js';
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
			<div className={styles.hero}>
				<div className={styles.titleBlock}>
					<h1 className={styles.title}>{config.name}</h1>
					<div className={styles.rule} />
					<p className={styles.subtitle}>
						{config.description}
						{totalEntries > 0 && <> · {totalEntries} entries</>}
					</p>
					<button className={styles.cta} onClick={handleEnter}>
						Enter the Archive →
					</button>
				</div>
			</div>

			<footer className={styles.footer}>
				<span className={styles.footerLabel}>Contents</span>
				<div className={styles.typeCounts}>
					{Object.entries(schema.types).map(([typeKey, typeDef]) => (
						<span key={typeKey} className={styles.typeEntry}>
							{typeKey} {typeCounts[typeKey] ?? 0}
						</span>
					))}
				</div>
				<span className={styles.pageNum}>1</span>
			</footer>
		</div>
	);
}
