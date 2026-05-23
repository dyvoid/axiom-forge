/**
 * ProjectContext — exposes the project's config + schema via useProject().
 *
 * Both are fetched through TanStack Query so the Sync button's
 * `queryClient.invalidateQueries()` causes them to refetch alongside the
 * folio index. Otherwise schema edits on disk would silently desync the
 * client until a full page reload.
 */

import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Config, ProjectSchema } from '@axiom-forge/shared';
import { fetchConfig, fetchSchema } from '../api/client.js';

interface ProjectContextValue {
	config: Config;
	schema: ProjectSchema;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function useProject(): ProjectContextValue {
	const ctx = useContext(ProjectContext);
	if (!ctx) throw new Error('useProject() must be used within <ProjectProvider>');
	return ctx;
}

export function useConfigQuery() {
	return useQuery({
		queryKey: ['config'],
		queryFn: fetchConfig,
		staleTime: Infinity,
	});
}

export function useSchemaQuery() {
	return useQuery({
		queryKey: ['schema'],
		queryFn: fetchSchema,
		staleTime: Infinity,
	});
}

export function ProjectProvider({ children }: { children: ReactNode }): JSX.Element {
	const configQuery = useConfigQuery();
	const schemaQuery = useSchemaQuery();

	if (configQuery.isLoading || schemaQuery.isLoading) {
		return (
			<div style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				height: '100vh',
				fontFamily: 'var(--ff-display)',
				color: 'var(--text-muted)',
				fontSize: 'var(--fs-eyebrow)',
				letterSpacing: 'var(--ls-eyebrow)',
				textTransform: 'uppercase',
			}}>
				Loading project…
			</div>
		);
	}

	const error = configQuery.error ?? schemaQuery.error;
	if (error || !configQuery.data || !schemaQuery.data) {
		const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
		return (
			<div style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				height: '100vh',
				fontFamily: 'var(--ff-body)',
				color: 'var(--accent-rust)',
			}}>
				Failed to load project: {message}
			</div>
		);
	}

	return (
		<ProjectContext.Provider value={{ config: configQuery.data, schema: schemaQuery.data }}>
			{children}
		</ProjectContext.Provider>
	);
}
