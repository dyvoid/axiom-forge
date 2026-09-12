/**
 * Landing route — project home page: title block, description, type counts,
 * the "Enter" CTA, and the WebGL hero behind them. A project can restyle or
 * disable the hero through its theme.json (ADR-0001).
 */

import { Suspense, lazy, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useProject } from '../context/ProjectContext.js';
import { useFolios, useTheme } from '../api/queries.js';
import { Icon } from '../components/ui/Icon.js';
import styles from './Landing.module.css';

import { WebGLHero } from '../hero/WebGLHero.js';
import { resolveHeroParams } from '../hero/heroTheme.js';
import type { HeroParams } from '../hero/heroParams.js';

// Debug panel for the hero shader; its own chunk, fetched only on `/?tune`.
const HeroTuner = lazy(() => import('../hero/HeroTuner.js').then((m) => ({ default: m.HeroTuner })));

export function Landing(): JSX.Element {
	const { config, schema } = useProject();
	const { data: folios } = useFolios();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const tuning = searchParams.has('tune');

	// The hero waits for the theme so a project never flashes the default
	// colors before its own. A failed fetch settles too, and falls back to the
	// defaults rather than leaving the page without a hero.
	const themeQuery = useTheme();
	const heroTheme = themeQuery.data?.hero;
	const heroEnabled = heroTheme?.enabled !== false;
	const projectParams = useMemo(() => resolveHeroParams(heroTheme), [heroTheme]);
	const [tunedParams, setTunedParams] = useState<HeroParams | null>(null);
	const heroParams = tuning && tunedParams ? tunedParams : projectParams;
	const showHero = !themeQuery.isLoading && (heroEnabled || tuning);

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
				{showHero && <WebGLHero variant="codex" params={heroParams} />}
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
						heroEnabled={heroEnabled}
						onChange={setTunedParams}
						contentHidden={contentHidden}
						onContentHiddenChange={setContentHidden}
					/>
				</Suspense>
			)}
		</>
	);
}
