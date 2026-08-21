import { useEffect, useState, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useWarnings } from '../../api/queries.js';
import { SchemaWarningsDialog } from '../ui/SchemaWarningsDialog.js';
import { Sidebar } from './Sidebar.js';
import { TopHeader } from './TopHeader.js';
import styles from './AppShell.module.css';

export function AppShell(): JSX.Element {
	const { data: warnings } = useWarnings();
	const [dismissed, setDismissed] = useState(false);
	const [drawerOpen, setDrawerOpen] = useState(false);
	const location = useLocation();

	const lastWarningsRef = useRef('');

	// Auto-show once when warnings first arrive or change content
	useEffect(() => {
		if (warnings && warnings.length > 0) {
			const str = JSON.stringify(warnings);
			if (str !== lastWarningsRef.current) {
				setDismissed(false);
				lastWarningsRef.current = str;
			}
		} else {
			lastWarningsRef.current = '';
		}
	}, [warnings]);

	// Close the drawer whenever the route changes — navigation implies the
	// user picked something, so the overlay should dismiss.
	useEffect(() => {
		setDrawerOpen(false);
	}, [location.pathname]);

	const showDialog = !dismissed && !!warnings && warnings.length > 0;

	return (
		<div className={styles.shell}>
			<a href="#main-content" className={styles.skipLink}>Skip to content</a>
			<TopHeader onToggleDrawer={() => setDrawerOpen((o) => !o)} />
			<div className={styles.body}>
				{/* Scrim: visible only when the drawer is open below --bp-drawer.
				    Clicking it closes the drawer. */}
				{drawerOpen && (
					<div
						className={styles.scrim}
						onClick={() => setDrawerOpen(false)}
						aria-hidden="true"
					/>
				)}
				<aside
					className={`${styles.sidebar} ${drawerOpen ? styles.drawerOpen : ''}`}
				>
					<Sidebar onNavigate={() => setDrawerOpen(false)} />
				</aside>
				<main className={styles.main} id="main-content">
					<Outlet />
				</main>
			</div>

			{showDialog && (
				<SchemaWarningsDialog
					warnings={warnings}
					onClose={() => setDismissed(true)}
				/>
			)}
		</div>
	);
}
