import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectProvider } from './context/ProjectContext.js';
import { Landing } from './routes/Landing.js';
import { FolioRead } from './routes/FolioRead.js';
import { NotFound } from './routes/NotFound.js';
import { AppShell } from './components/layout/AppShell.js';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: 1,
			refetchOnWindowFocus: true,
		},
	},
});

import { ArchiveIndexView } from './components/folio/ArchiveIndexView.js';
import { CategoryIndexView } from './components/folio/CategoryIndexView.js';

export function App(): JSX.Element {
	return (
		<QueryClientProvider client={queryClient}>
			<ProjectProvider>
				<BrowserRouter>
					<Routes>
						<Route path="/" element={<Landing />} />
						<Route element={<AppShell />}>
							<Route path="/archive" element={<ArchiveIndexView />} />
							<Route path="/folio/:folder" element={<CategoryIndexView />} />
							<Route path="/folio/:folder/:name" element={<FolioRead />} />
						</Route>
						<Route path="*" element={<NotFound />} />
					</Routes>
				</BrowserRouter>
			</ProjectProvider>
		</QueryClientProvider>
	);
}
