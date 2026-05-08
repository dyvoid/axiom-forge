import { useState } from 'react';
import styles from './SchemaWarningsDialog.module.css';

interface WarningEntry {
	folder: string;
	name: string;
	warnings: string[];
}

interface Props {
	warnings: WarningEntry[];
	onClose: () => void;
}

export function SchemaWarningsDialog({ warnings, onClose }: Props): JSX.Element {
	const [copied, setCopied] = useState(false);

	const totalCount = warnings.reduce((n, e) => n + e.warnings.length, 0);

	function buildCopyText(): string {
		return warnings
			.map((e) => {
				const header = `${e.folder}/${e.name}`;
				const lines = e.warnings.map((w) => `  - ${w}`).join('\n');
				return `${header}\n${lines}`;
			})
			.join('\n\n');
	}

	function handleCopy(): void {
		navigator.clipboard.writeText(buildCopyText()).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	}

	return (
		<div className={styles.overlay} onClick={onClose}>
			<div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
				<div className={styles.header}>
					<span className={styles.title}>Schema Warnings</span>
					<span className={styles.count}>
						{totalCount} {totalCount === 1 ? 'warning' : 'warnings'} across {warnings.length} {warnings.length === 1 ? 'file' : 'files'}
					</span>
				</div>

				<div className={styles.body}>
					{warnings.map((entry) => (
						<div key={`${entry.folder}/${entry.name}`} className={styles.fileBlock}>
							<div className={styles.filePath}>{entry.folder}/{entry.name}</div>
							<div className={styles.warningList}>
								{entry.warnings.map((w, i) => (
									<div key={i} className={styles.warningItem}>{w}</div>
								))}
							</div>
						</div>
					))}
				</div>

				<div className={styles.footer}>
					<button type="button" className={styles.btnCopy} onClick={handleCopy}>
						{copied ? 'Copied!' : 'Copy all'}
					</button>
					<button type="button" className={styles.btnClose} onClick={onClose}>
						Dismiss
					</button>
				</div>
			</div>
		</div>
	);
}
