/**
 * Harness for components that read the folio index or the schema.
 *
 * Both come through TanStack Query in the real app. Rather than mocking the
 * fetch layer, the query client is pre-seeded with the same cache keys the
 * hooks use, so the components run their real code paths against a fixture
 * project modelled on `fall-of-troy`.
 */

import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createSchemaIndex, type FolioIndexRecord, type ProjectSchema } from '@axiom-forge/shared';
import { render, type RenderResult } from '@testing-library/react';
import { ProjectContext } from '../context/ProjectContext.js';

export const schema: ProjectSchema = {
	version: '1',
	types: {
		Human: {
			icon: 'user',
			folder: 'Humans',
			sections: { Vitals: { role: 'meta', fields: { Origin: { type: 'text' } } } },
		},
		God: {
			icon: 'sparkles',
			folder: 'Gods',
			sections: { Vitals: { role: 'meta', fields: { Domain: { type: 'text' } } } },
		},
		Location: {
			icon: 'map-pin',
			folder: 'Locations',
			sections: { Vitals: { role: 'meta', fields: { Region: { type: 'text' } } } },
		},
	},
};

/* Odysseus carries the alias that the shipped regression could not find. */
export const folios: FolioIndexRecord[] = [
	{ id: 1, type: 'Human', folder: 'Humans', name: 'Odysseus', title: 'Odysseus', tags: ['greek'], aliases: ['Ulysses'] },
	{ id: 2, type: 'Human', folder: 'Humans', name: 'Achilles', title: 'Achilles', tags: ['greek'] },
	{ id: 3, type: 'God', folder: 'Gods', name: 'Athena', title: 'Athena', tags: ['olympian'] },
	{ id: 4, type: 'Location', folder: 'Locations', name: 'Troy', title: 'Troy', tags: [] },
];

export function renderWithProject(ui: ReactElement): RenderResult {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: Infinity } },
	});
	queryClient.setQueryData(['folios'], folios);

	const schemaIndex = createSchemaIndex(schema);
	const config = { title: 'The Fall of Troy' } as never;

	function Wrapper({ children }: { children: ReactNode }): JSX.Element {
		return (
			<QueryClientProvider client={queryClient}>
				<ProjectContext.Provider value={{ config, schema, schemaIndex }}>
					{children}
				</ProjectContext.Provider>
			</QueryClientProvider>
		);
	}

	return render(ui, { wrapper: Wrapper });
}
