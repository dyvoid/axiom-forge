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

import type { FolioIndexRecord } from '@axiom-forge/shared';
import { Icon } from './Icon.js';
import styles from './EntryContent.module.css';

export type EntryVariant =
	/** Stacked block: title + folder, aliases, snippet. Search dropdown, Linked Mentions. */
	| 'card'
	/** Two-column row: title + aliases on the left, snippet or tags on the right. */
	| 'row'
	/** Dense single line: icon + title + aliases. Grand Index columns. */
	| 'inline';

interface EntryContentProps {
	folio: FolioIndexRecord;
	variant: EntryVariant;
	/** Icon name for the `inline` variant. Ignored by the others. */
	icon?: string;
}

/** The `aka …` line. Rendered by every variant that has room for it. */
function Aliases({ aliases, className }: { aliases: string[]; className: string }): JSX.Element {
	return <span className={className}>aka {aliases.join(' · ')}</span>;
}

export function EntryContent({ folio, variant, icon }: EntryContentProps): JSX.Element {
	const aliases = folio.aliases ?? [];
	const hasAliases = aliases.length > 0;

	if (variant === 'inline') {
		return (
			<>
				{icon && (
					<span className={styles.iconWrapper}>
						<Icon name={icon} size={10} />
					</span>
				)}
				{folio.title}
				{hasAliases && <Aliases aliases={aliases} className={styles.inlineAliases} />}
			</>
		);
	}

	if (variant === 'row') {
		return (
			<>
				{/*
				 * Aliases sit on their own line *below* the title, never inline. The
				 * name column is a fixed width so every row's description starts at
				 * the same x; an inline alias would push it and leave the list ragged.
				 */}
				<span className={styles.rowTitle}>
					{folio.title}
					{hasAliases && <Aliases aliases={aliases} className={styles.rowAliases} />}
				</span>
				<div className={styles.rowMeta}>
					{folio.snippet ? (
						<span className={styles.rowSnippet}>{folio.snippet}</span>
					) : (
						folio.tags.length > 0 && (
							<span className={styles.rowTags}>{folio.tags.join(' · ')}</span>
						)
					)}
				</div>
			</>
		);
	}

	return (
		<>
			{/*
			 * The alias rides on the title line rather than taking one of its own, so
			 * an aliased card is exactly as tall as an unaliased one. Cards sit in a
			 * stretch grid, so a taller card would pad out every neighbour in its row.
			 * It truncates when space runs short — the folio page shows the full list.
			 */}
			<div className={styles.cardHeader}>
				<span className={styles.cardHeading}>
					<span className={styles.cardTitle}>{folio.title}</span>
					{hasAliases && <Aliases aliases={aliases} className={styles.cardAliases} />}
				</span>
				<span className={styles.cardFolder}>{folio.folder}</span>
			</div>
			{folio.snippet && <div className={styles.cardSnippet}>{folio.snippet}</div>}
		</>
	);
}
