/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import type { ProjectLibrary } from '../api/client.js';
import { Projects } from './Projects.js';

const troy = { id: 'troy', path: '/worlds/fall-of-troy', name: 'The Fall of Troy', description: 'Ten years of war', available: true };
const winter = { id: 'winter', path: '/worlds/long-winter', name: 'The Long Winter', available: true };
const lost = { id: 'lost', path: '/worlds/atlantis', name: 'atlantis', available: false, problem: 'This folder is no longer there.' };

/** Answers each API call from a table of `METHOD path` → response, and records what was asked. */
function mockApi(routes: Record<string, { status?: number; body: unknown }>) {
	const calls: string[] = [];
	vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
		const key = `${init?.method ?? 'GET'} ${url}`;
		calls.push(key);
		const route = routes[key];
		if (!route) return new Response(JSON.stringify({ error: `unmocked: ${key}` }), { status: 500 });
		return new Response(JSON.stringify(route.body), { status: route.status ?? 200 });
	}));
	return calls;
}

function renderProjects(library: ProjectLibrary) {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
	queryClient.setQueryData(['projects'], library);
	const router = createMemoryRouter(
		[
			{ path: '/projects', element: <Projects /> },
			{ path: '/', element: <p>project home</p> },
			{ path: '/open/:id', element: <p>opening</p> },
		],
		{ initialEntries: ['/projects'] },
	);
	render(
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>,
	);
	return router;
}

beforeEach(() => {
	// The focus trap asks for layout, which jsdom does not have.
	Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
		configurable: true,
		get(this: HTMLElement) { return this.parentNode; },
	});
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe('the project list', () => {
	it('lists every project, marks the open one, and offers a way back to it', () => {
		renderProjects({ activeId: 'troy', projects: [troy, winter] });

		expect(screen.getByText('2 projects')).toBeInTheDocument();
		const openRow = screen.getByText('The Fall of Troy').closest('li')!;
		expect(within(openRow).getByText('Open now')).toBeInTheDocument();
		expect(within(openRow).getByText('/worlds/fall-of-troy')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /Return to The Fall of Troy/ })).toHaveAttribute('href', '/');
		expect(within(screen.getByText('The Long Winter').closest('li')!).queryByText('Open now')).toBeNull();
	});

	it('says so when there are none, and still offers the add form', () => {
		renderProjects({ activeId: null, projects: [] });
		expect(screen.getByText(/No projects yet/)).toBeInTheDocument();
		expect(screen.getByRole('textbox', { name: 'Folder path' })).toBeInTheDocument();
		expect(screen.queryByRole('link', { name: /Return to/ })).toBeNull();
	});

	it('shows why a project is unavailable and only lets it be removed', () => {
		renderProjects({ activeId: 'troy', projects: [troy, lost] });
		const row = screen.getByText('atlantis').closest('li')!;
		expect(within(row).getByText('This folder is no longer there.')).toBeInTheDocument();
		expect(within(row).getByRole('button', { name: 'Open atlantis' })).toBeDisabled();
		expect(within(row).getByRole('button', { name: 'Settings for atlantis' })).toBeDisabled();
		expect(within(row).getByRole('button', { name: 'Remove atlantis' })).toBeEnabled();
	});

	it('opens another project through /open, and the open one by going home', async () => {
		const router = renderProjects({ activeId: 'troy', projects: [troy, winter] });
		await userEvent.click(screen.getByRole('button', { name: 'Open The Long Winter' }));
		expect(router.state.location.pathname).toBe('/open/winter');

		cleanup();
		const again = renderProjects({ activeId: 'troy', projects: [troy, winter] });
		await userEvent.click(screen.getByRole('button', { name: 'Open The Fall of Troy' }));
		expect(again.state.location.pathname).toBe('/');
	});
});

describe('removing a project', () => {
	it('unlists by default, without touching the files', async () => {
		const calls = mockApi({ 'DELETE /api/projects/winter': { body: { activeId: 'troy', projects: [troy] } } });
		renderProjects({ activeId: 'troy', projects: [troy, winter] });

		await userEvent.click(screen.getByRole('button', { name: 'Remove The Long Winter' }));
		const dialog = screen.getByRole('dialog', { name: 'Remove project' });
		expect(dialog).toHaveTextContent('stay where they are');
		await userEvent.click(within(dialog).getByRole('button', { name: 'Remove from list' }));

		expect(await screen.findByText('1 project')).toBeInTheDocument();
		expect(calls).toEqual(['DELETE /api/projects/winter']);
	});

	it('deletes from disk only after the name is typed', async () => {
		const calls = mockApi({
			'DELETE /api/projects/winter?deleteFiles=true&confirmName=The+Long+Winter': {
				body: { activeId: 'troy', projects: [troy] },
			},
		});
		renderProjects({ activeId: 'troy', projects: [troy, winter] });

		await userEvent.click(screen.getByRole('button', { name: 'Remove The Long Winter' }));
		await userEvent.click(screen.getByRole('button', { name: 'Delete files…' }));

		const dialog = screen.getByRole('dialog', { name: 'Delete from disk' });
		const confirm = within(dialog).getByRole('button', { name: 'Delete folder' });
		expect(confirm).toBeDisabled();

		const input = within(dialog).getByRole('textbox');
		await userEvent.type(input, 'the long winter');
		expect(confirm).toBeDisabled(); // case matters: it must be this project's name
		await userEvent.clear(input);
		await userEvent.type(input, 'The Long Winter');
		await userEvent.click(confirm);

		expect(await screen.findByText('1 project')).toBeInTheDocument();
		expect(calls).toHaveLength(1);
	});

	it('does not offer to delete the files of a project it cannot find', async () => {
		renderProjects({ activeId: 'troy', projects: [troy, lost] });
		await userEvent.click(screen.getByRole('button', { name: 'Remove atlantis' }));
		expect(screen.queryByRole('button', { name: 'Delete files…' })).toBeNull();
	});
});

describe('adding a project', () => {
	it('opens a folder that already holds a project', async () => {
		mockApi({ 'POST /api/projects': { status: 201, body: { activeId: 'winter', projects: [troy, winter] } } });
		const router = renderProjects({ activeId: 'troy', projects: [troy] });

		await userEvent.type(screen.getByRole('textbox', { name: 'Folder path' }), '/worlds/long-winter');
		await userEvent.click(screen.getByRole('button', { name: 'Add project' }));

		await screen.findByText('project home');
		expect(router.state.location.pathname).toBe('/');
	});

	it('offers to start a project in a folder that holds none, then creates it', async () => {
		const fetchMock = vi.fn()
			.mockResolvedValueOnce(new Response(
				JSON.stringify({ error: 'not-a-project', path: '/worlds/new-world', canCreate: true }),
				{ status: 404 },
			))
			.mockResolvedValueOnce(new Response(
				JSON.stringify({ activeId: 'new', projects: [troy, { id: 'new', path: '/worlds/new-world', name: 'New world', available: true }] }),
				{ status: 201 },
			));
		vi.stubGlobal('fetch', fetchMock);
		renderProjects({ activeId: 'troy', projects: [troy] });

		await userEvent.type(screen.getByRole('textbox', { name: 'Folder path' }), '/worlds/new-world');
		await userEvent.click(screen.getByRole('button', { name: 'Add project' }));

		// The folder's own name is the suggested project name.
		const name = await screen.findByRole('textbox', { name: 'Name' });
		expect(name).toHaveValue('New world');
		await userEvent.click(screen.getByRole('button', { name: 'Start project' }));

		await screen.findByText('project home');
		expect(JSON.parse(fetchMock.mock.calls[1]![1].body as string)).toEqual({
			path: '/worlds/new-world',
			create: { name: 'New world', description: '' },
		});
	});

	it('reports a folder that cannot be added, in the server\'s words', async () => {
		mockApi({ 'POST /api/projects': { status: 400, body: { error: 'Enter a full path, starting from the drive or the root folder.' } } });
		renderProjects({ activeId: 'troy', projects: [troy] });

		await userEvent.type(screen.getByRole('textbox', { name: 'Folder path' }), 'worlds/x');
		await userEvent.click(screen.getByRole('button', { name: 'Add project' }));

		expect(await screen.findByRole('alert')).toHaveTextContent('Enter a full path');
	});
});

describe('project settings', () => {
	it('edits the name in place and saves it', async () => {
		const renamed = { ...winter, name: 'Fimbulwinter' };
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ activeId: 'troy', projects: [troy, renamed] }), { status: 200 }),
		);
		vi.stubGlobal('fetch', fetchMock);
		renderProjects({ activeId: 'troy', projects: [troy, winter] });

		await userEvent.click(screen.getByRole('button', { name: 'Settings for The Long Winter' }));
		const form = screen.getByRole('form', { name: 'Settings for The Long Winter' });
		const name = within(form).getByRole('textbox', { name: 'Name' });
		await userEvent.clear(name);
		expect(within(form).getByRole('button', { name: 'Save settings' })).toBeDisabled();
		await userEvent.type(name, 'Fimbulwinter');
		await userEvent.click(within(form).getByRole('button', { name: 'Save settings' }));

		expect(await screen.findByText('Fimbulwinter')).toBeInTheDocument();
		expect(fetchMock.mock.calls[0]![0]).toBe('/api/projects/winter');
		expect(JSON.parse(fetchMock.mock.calls[0]![1].body as string)).toEqual({ name: 'Fimbulwinter', description: '', version: '' });
	});
});
