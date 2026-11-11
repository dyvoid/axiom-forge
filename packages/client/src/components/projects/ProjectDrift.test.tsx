/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { getWindowProject, setWindowProject, type ProjectLibrary } from '../../api/client.js';
import { ProjectDrift } from './ProjectDrift.js';

const troy = { id: 'troy', path: '/worlds/troy', name: 'The Fall of Troy', available: true };
const winter = { id: 'winter', path: '/worlds/winter', name: 'The Long Winter', available: true };

/** Render with the server's list seeded, and a folio query standing in for "this window's content". */
function renderDrift(library: ProjectLibrary) {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
	queryClient.setQueryData(['projects'], library);
	queryClient.setQueryData(['folios'], [{ name: 'Achilles' }]);
	const router = createMemoryRouter(
		[
			{ path: '/', element: <ProjectDrift /> },
			{ path: '/open/:id', element: <p>opening</p> },
		],
		{ initialEntries: ['/'] },
	);
	render(
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>,
	);
	return { queryClient, router };
}

beforeEach(() => {
	Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
		configurable: true,
		get(this: HTMLElement) { return this.parentNode; },
	});
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe('ProjectDrift', () => {
	it('stays out of the way while the server and this window agree', () => {
		setWindowProject('troy');
		renderDrift({ activeId: 'troy', projects: [troy, winter] });
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('asks, and keeps this window\'s content, when another window has switched', async () => {
		setWindowProject('troy');
		const { queryClient } = renderDrift({ activeId: 'winter', projects: [troy, winter] });

		const dialog = screen.getByRole('dialog', { name: 'Project changed elsewhere' });
		expect(dialog).toHaveTextContent('“The Long Winter” was opened in another window');
		// Not followed: the window still claims Troy, and what it had loaded is intact.
		expect(getWindowProject()).toBe('troy');
		expect(queryClient.getQueryData(['folios'])).toEqual([{ name: 'Achilles' }]);
	});

	it('reopens this window\'s project on request, without clearing anything', async () => {
		setWindowProject('troy');
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ activeId: 'troy', projects: [troy, winter] }), { status: 200 }),
		);
		vi.stubGlobal('fetch', fetchMock);
		const { queryClient } = renderDrift({ activeId: 'winter', projects: [troy, winter] });

		await userEvent.click(screen.getByRole('button', { name: 'Reopen it here' }));

		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		expect(fetchMock.mock.calls[0]![0]).toBe('/api/projects/troy/activate');
		expect(queryClient.getQueryData(['folios'])).toEqual([{ name: 'Achilles' }]);
	});

	it('follows the switch through /open, so an open editor can object first', async () => {
		setWindowProject('troy');
		const { router } = renderDrift({ activeId: 'winter', projects: [troy, winter] });
		await userEvent.click(screen.getByRole('button', { name: 'Switch this window too' }));
		expect(router.state.location.pathname).toBe('/open/winter');
	});

	it('simply follows when this window\'s project is gone from the list', async () => {
		setWindowProject('troy');
		renderDrift({ activeId: 'winter', projects: [winter] });
		await waitFor(() => expect(getWindowProject()).toBe('winter'));
		expect(screen.queryByRole('dialog')).toBeNull();
	});
});
