import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useWarnings } from '../../api/queries.js';
import { SchemaWarningsDialog } from '../ui/SchemaWarningsDialog.js';
import { Sidebar } from './Sidebar.js';
import { TopHeader } from './TopHeader.js';
import styles from './AppShell.module.css';

export function AppShell(): JSX.Element {
	const { data: warnings } = useWarnings();
	const [dismissed, setDismissed] = useState(false);

	// Auto-show once when warnings first arrive
	useEffect(() => {
		if (warnings && warnings.length > 0) {
			setDismissed(false);
		}
	}, [warnings]);

	const showDialog = !dismissed && !!warnings && warnings.length > 0;

	return (
		<div className={styles.shell}>
			<TopHeader />
			<div className={styles.body}>
				<aside className={styles.sidebar}>
					<Sidebar />
				</aside>
				<main className={styles.main}>
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
