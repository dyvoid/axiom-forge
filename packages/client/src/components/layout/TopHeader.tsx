import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useProject } from '../../context/ProjectContext.js';
import { Icon } from '../ui/Icon.js';
import { reloadProject } from '../../api/client.js';
import styles from './TopHeader.module.css';

export function TopHeader(): JSX.Element {
	const { config } = useProject();
	const queryClient = useQueryClient();
	const [syncing, setSyncing] = useState(false);

	async function handleSync() {
		if (syncing) return;
		setSyncing(true);
		try {
			await reloadProject();
			await queryClient.invalidateQueries();
		} finally {
			setSyncing(false);
		}
	}

	return (
		<header className={styles.header}>
			<Link to="/index" className={styles.left}>
				<span className={styles.logo}>AXIOM · FORGE</span>
				<div className={styles.separator} />
				<span className={styles.projectTitle}>{config.name}</span>
			</Link>
			<div className={styles.right}>
				<button
					className={styles.syncButton}
					onClick={handleSync}
					disabled={syncing}
					title="Reload project from disk"
				>
					<Icon name="refresh-cw" size={14} className={syncing ? styles.spinning : undefined} />
				</button>
				<div className={styles.searchBox}>
					<Icon name="search" size={14} className={styles.searchIcon} />
					<input
						type="text"
						placeholder="Search the index..."
						className={styles.searchInput}
					/>
					<span className={styles.shortcut}>/</span>
				</div>
			</div>
		</header>
	);
}
