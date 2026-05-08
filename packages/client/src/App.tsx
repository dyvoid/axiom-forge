import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectProvider } from './context/ProjectContext.js';
import { Landing } from './routes/Landing.js';
import { FolioRead } from './routes/FolioRead.js';
import { FolioEdit } from './routes/FolioEdit.js';
import { NotFound } from './routes/NotFound.js';
import { AppShell } from './components/layout/AppShell.js';
import { GrandIndexView } from './components/folio/GrandIndexView.js';
import { CategoryIndexView } from './components/folio/CategoryIndexView.js';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: 1,
			refetchOnWindowFocus: true,
		},
	},
});

const router = createBrowserRouter([
	{ path: '/', element: <Landing /> },
	{
		element: <AppShell />,
		children: [
			{ path: '/index', element: <GrandIndexView /> },
			{ path: '/folio/:folder', element: <CategoryIndexView /> },
			{ path: '/folio/:folder/:name', element: <FolioRead /> },
			{ path: '/folio/:folder/:name/edit', element: <FolioEdit /> },
		],
	},
	{ path: '*', element: <NotFound /> },
]);

export function App(): JSX.Element {
	return (
		<QueryClientProvider client={queryClient}>
			<ProjectProvider>
				<RouterProvider router={router} />
			</ProjectProvider>
		</QueryClientProvider>
	);
}
