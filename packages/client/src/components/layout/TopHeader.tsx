import { useProject } from '../../context/ProjectContext.js';
import { Icon } from '../ui/Icon.js';
import styles from './TopHeader.module.css';

export function TopHeader(): JSX.Element {
	const { config } = useProject();

	return (
		<header className={styles.header}>
			<div className={styles.left}>
				<span className={styles.logo}>AXIOM · FORGE</span>
				<div className={styles.separator} />
				<span className={styles.projectTitle}>{config.name}</span>
			</div>
			<div className={styles.right}>
				<div className={styles.searchBox}>
					<Icon name="search" size={14} className={styles.searchIcon} />
					<input 
						type="text" 
						placeholder="Search the archive..." 
						className={styles.searchInput}
					/>
					<span className={styles.shortcut}>/</span>
				</div>
			</div>
		</header>
	);
}
