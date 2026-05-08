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

export function App(): JSX.Element {
	return (
		<QueryClientProvider client={queryClient}>
			<ProjectProvider>
				<BrowserRouter>
					<Routes>
						<Route path="/" element={<Landing />} />
						<Route element={<AppShell />}>
							<Route path="/folio/:folder/:name" element={<FolioRead />} />
						</Route>
						<Route path="*" element={<NotFound />} />
					</Routes>
				</BrowserRouter>
			</ProjectProvider>
		</QueryClientProvider>
	);
}
