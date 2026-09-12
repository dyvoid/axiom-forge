/**
 * Landing route — project home page.
 * Phase 1: title block, description, type counts, "Enter" CTA.
 * WebGL hero will be layered in after we confirm the basics work.
 */

import { Suspense, lazy, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useProject } from '../context/ProjectContext.js';
import { useFolios } from '../api/queries.js';
import { Icon } from '../components/ui/Icon.js';
import styles from './Landing.module.css';

import { WebGLHero } from '../hero/WebGLHero.js';
import { DEFAULT_HERO_PARAMS, type HeroParams } from '../hero/heroParams.js';

// Debug panel for the hero shader; its own chunk, fetched only on `/?tune`.
const HeroTuner = lazy(() => import('../hero/HeroTuner.js').then((m) => ({ default: m.HeroTuner })));

export function Landing(): JSX.Element {
	const { config, schema } = useProject();
	const { data: folios } = useFolios();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const tuning = searchParams.has('tune');
	const [heroParams, setHeroParams] = useState<HeroParams>(DEFAULT_HERO_PARAMS);
	const [contentHidden, setContentHidden] = useState(false);

	// Count folios per type
	const typeCounts: Record<string, number> = {};
	if (folios) {
		for (const f of folios) {
			typeCounts[f.type] = (typeCounts[f.type] ?? 0) + 1;
		}
	}

	const totalEntries = folios?.length ?? 0;

	function handleEnter() {
		navigate('/index');
	}

	return (
		<>
			<div className={contentHidden ? `${styles.landing} ${styles.contentHidden}` : styles.landing}>
				<WebGLHero variant="codex" params={heroParams} />
				<div className={styles.topCorners}>
					<div className={styles.topLeft}>AXIOM · FORGE</div>
					<div className={styles.topRight}>
						{config.version ? `ARCHIVE VOL. ${config.version.toUpperCase()} ` : ''}
					</div>
				</div>
				<div className={styles.hero}>
					<div className={styles.titleBlock}>
						<h1 className={styles.title}>{config.name}</h1>
						<div className={styles.subtitleRow}>
							<div className={styles.line} />
							<p className={styles.subtitle}>
								{config.description ? `${config.description.toUpperCase()} · ` : ''}{totalEntries} ENTRIES
							</p>
							<div className={styles.line} />
						</div>
						<button className={styles.cta} onClick={handleEnter}>
							ENTER &nbsp; →
						</button>
					</div>
				</div>
	
				<footer className={styles.footer}>
					<div className={styles.typeCounts}>
						{Object.entries(schema.types).map(([typeKey, typeDef]) => {
							const count = typeCounts[typeKey] ?? 0;
							return (
								<button 
									key={typeKey} 
									className={styles.typeEntry}
									onClick={() => navigate(`/folio/${typeDef.folder}`)}
								>
									<Icon name={typeDef.icon} className={styles.typeIcon} size={12} />
									{typeKey} <span className={styles.count}>{count}</span>
								</button>
							);
						})}
					</div>
				</footer>
			</div>
			{tuning && (
				<Suspense fallback={null}>
					<HeroTuner
						params={heroParams}
						onChange={setHeroParams}
						contentHidden={contentHidden}
						onContentHiddenChange={setContentHidden}
					/>
				</Suspense>
			)}
		</>
	);
}
