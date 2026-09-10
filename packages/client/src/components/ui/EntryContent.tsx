/**
 * Shared presentation of a folio index record (ADR-0011).
 *
 * A folio used to be rendered as a compact entry in five hand-rolled places,
 * each showing a different field set — so adding `aliases` meant making the
 * same presentation decision five times. This component owns *what* an entry
 * shows and in what order.
 *
 * It deliberately renders content only, never a wrapper. Callers keep their own
 * element (`Link`, `NavLink`, or a `div` with a click handler) and their own
 * interaction chrome — hover, active, keyboard highlight, card borders, grid
 * placement. That split is what keeps the prop surface narrow: the variants
 * below differ in layout of the same fields, not in behaviour.
 *
 * The sidebar is not a variant. It renders the title alone, so it has no field
 * set to share and wrapping it here would be indirection with nothing inside.
 */

import { useEffect, useState } from 'react';
import type { FolioIndexRecord } from '@axiom-forge/shared';
import { coverImageUrl } from '../../api/client.js';
import { Icon } from './Icon.js';
import styles from './EntryContent.module.css';

export type EntryVariant =
	/** Stacked block: title + folder, snippet. Search dropdown, Linked Mentions. */
	| 'card'
	/** Two-column row: title on the left, snippet or tags on the right. Category Index. */
	| 'row'
	/** Dense single line: icon + title. Grand Index columns. */
	| 'inline';

interface EntryContentProps {
	folio: FolioIndexRecord;
	variant: EntryVariant;
	/** Icon name for the `inline` variant. Ignored by the others. */
	icon?: string;
}

function EntryThumbnail({ folio }: { folio: FolioIndexRecord }): JSX.Element | null {
	const [failed, setFailed] = useState(false);
	const src = coverImageUrl(folio.folder, folio.name);
	useEffect(() => setFailed(false), [src, folio.coverImage?.path]);
	if (!folio.coverImage || failed) return null;
	return (
		<span className={styles.thumbnailFrame}>
			<img className={styles.thumbnail} src={src} alt="" onError={() => setFailed(true)} />
		</span>
	);
}

export function EntryContent({ folio, variant, icon }: EntryContentProps): JSX.Element {
	if (variant === 'inline') {
		return (
			<>
				{icon && (
					<span className={styles.iconWrapper}>
						<Icon name={icon} size={12} />
					</span>
				)}
				<span className={styles.inlineTitle}>{folio.title}</span>
			</>
		);
	}

	if (variant === 'row') {
		// One line, always: name column then a single gloss line carrying the
		// snippet, or the tag fallback. Anything that overruns ellipses rather
		// than wrapping, so every row in an index is the same height and the
		// gloss column starts at the same x on every row.
		const gloss = folio.snippet ? (
			<span className={styles.rowSnippet}>{folio.snippet}</span>
		) : folio.tags.length > 0 ? (
			<span className={styles.rowTags}>{folio.tags.join(' · ')}</span>
		) : null;

		return (
			<>
				<span className={styles.rowTitle}>{folio.title}</span>
				<span className={styles.rowLine}>{gloss}</span>
			</>
		);
	}

	return (
		<div className={styles.cardLayout}>
			<EntryThumbnail folio={folio} />
			<div className={styles.cardBody}>
				{/* Aliases stay on the folio page so the card title keeps its full width. */}
				<div className={styles.cardHeader}>
					<span className={styles.cardHeading}>
						<span className={styles.cardTitle}>{folio.title}</span>
					</span>
					<span className={styles.cardFolder}>{folio.folder}</span>
				</div>
				{folio.snippet && <div className={styles.cardSnippet}>{folio.snippet}</div>}
			</div>
		</div>
	);
}
