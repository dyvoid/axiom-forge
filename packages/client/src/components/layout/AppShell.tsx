import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.js';
import styles from './AppShell.module.css';

export function AppShell(): JSX.Element {
	return (
		<div className={styles.shell}>
			<aside className={styles.sidebar}>
				<Sidebar />
			</aside>
			<main className={styles.main}>
				<Outlet />
			</main>
		</div>
	);
}
