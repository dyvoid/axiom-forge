import styles from './FolioSkeleton.module.css';
import readStyles from './FolioReadView.module.css';

export function FolioSkeleton(): JSX.Element {
	return (
		<div className={`${readStyles.container} ${styles.skeleton}`}>
			<div className={styles.eyebrow} />
			<div className={styles.title} />
			<div className={styles.aliases} />

			<div className={readStyles.divider} />
			<div className={readStyles.topBlock}>
				<div className={readStyles.proseCol}>
					<div className={styles.textBlock}>
						<div className={styles.textLine} />
						<div className={styles.textLine} />
						<div className={styles.textLine} />
						<div className={styles.textLine} />
					</div>
					<div className={styles.textBlock}>
						<div className={styles.textLine} />
						<div className={styles.textLine} />
						<div className={styles.textLine} />
					</div>
				</div>
				<div className={readStyles.metaCol}>
					<div className={styles.metaItem}>
						<div className={styles.metaLabel} />
					</div>
					<div className={styles.metaItem}>
						<div className={styles.metaLabel} />
					</div>
					<div className={styles.metaItem}>
						<div className={styles.metaLabel} />
					</div>
				</div>
			</div>
			
			<div className={styles.loadingText}>Illuminating folio…</div>
		</div>
	);
}
