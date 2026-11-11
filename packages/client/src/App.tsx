import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectProvider } from './context/ProjectContext.js';
import { Landing } from './routes/Landing.js';
import { FolioRead } from './routes/FolioRead.js';
import { FolioEdit } from './routes/FolioEdit.js';
import { FolioNew } from './routes/FolioNew.js';
import { NotFound } from './routes/NotFound.js';
import { Projects } from './routes/Projects.js';
import { ProjectOpen } from './routes/ProjectOpen.js';
import { AppShell } from './components/layout/AppShell.js';
import { ProjectDrift } from './components/projects/ProjectDrift.js';
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

function Root(): JSX.Element {
	return (
		<>
			<Outlet />
			<ProjectDrift />
		</>
	);
}

/** Routes that show a project's contents: held back until one is open. */
function ProjectRoutes(): JSX.Element {
	return (
		<ProjectProvider>
			<Outlet />
		</ProjectProvider>
	);
}

const router = createBrowserRouter([
	{
		element: <Root />,
		children: [
			// Outside the project gate: these are how a project gets opened.
			{ path: '/projects', element: <Projects /> },
			{ path: '/open/:id', element: <ProjectOpen /> },
			{
				element: <ProjectRoutes />,
				children: [
					{ path: '/', element: <Landing /> },
					{
						element: <AppShell />,
						children: [
							{ path: '/index', element: <GrandIndexView /> },
							{ path: '/folio/:folder', element: <CategoryIndexView /> },
							// Kept off /folio/:folder/* so it can never collide with a folio
							// whose filename happens to be "new".
							{ path: '/new/:folder', element: <FolioNew /> },
							{ path: '/folio/:folder/:name', element: <FolioRead /> },
							{ path: '/folio/:folder/:name/edit', element: <FolioEdit /> },
						],
					},
				],
			},
			{ path: '*', element: <NotFound /> },
		],
	},
]);

export function App(): JSX.Element {
	return (
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	);
}
