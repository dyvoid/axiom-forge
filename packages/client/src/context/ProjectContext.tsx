/**
 * ProjectContext — exposes the open project's config + schema via useProject().
 *
 * Both are fetched through TanStack Query so the Sync button's
 * `queryClient.invalidateQueries()` causes them to refetch alongside the
 * folio index. Otherwise schema edits on disk would silently desync the
 * client until a full page reload.
 *
 * Which project is open is the server's to say (ADR-0023); the provider reads
 * it from the project list and holds its children back until one is.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { createSchemaIndex, type Config, type ProjectSchema, type SchemaIndex } from '@axiom-forge/shared';
import { fetchConfig, fetchSchema, getWindowProject } from '../api/client.js';
import { useProjects } from '../api/queries.js';
import { LoadingState } from '../components/ui/LoadingState.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import styles from './ProjectContext.module.css';

interface ProjectContextValue {
	config: Config;
	schema: ProjectSchema;
	/** Pre-computed schema lookups (ADR-0019) — rebuilt whenever the schema refetches. */
	schemaIndex: SchemaIndex;
}

/* Exported so tests can provide a fixture project without standing up the
   provider's queries. Application code should use ProjectProvider. */
export const ProjectContext = createContext<ProjectContextValue | null>(null);

export function useProject(): ProjectContextValue {
	const ctx = useContext(ProjectContext);
	if (!ctx) throw new Error('useProject() must be used within <ProjectProvider>');
	return ctx;
}

function useConfigQuery(enabled: boolean) {
	return useQuery({
		queryKey: ['config'],
		queryFn: fetchConfig,
		staleTime: Infinity,
		enabled,
	});
}

function useSchemaQuery(enabled: boolean) {
	return useQuery({
		queryKey: ['schema'],
		queryFn: fetchSchema,
		staleTime: Infinity,
		enabled,
	});
}

/**
 * Gate for everything that shows a project's contents. Waits for the project
 * list, sends the user to `/projects` when none is open, then waits for the
 * open project's config and schema.
 */
export function ProjectProvider({ children }: { children: ReactNode }): JSX.Element {
	const projectsQuery = useProjects();
	// The project this window is showing, which is the server's open project
	// except in the moment after another window has switched (see ProjectDrift).
	const hasProject = Boolean(projectsQuery.data && getWindowProject());
	const configQuery = useConfigQuery(hasProject);
	const schemaQuery = useSchemaQuery(hasProject);

	// A schema that can't be indexed (two types on one folder) is a project the
	// app cannot serve, so it surfaces through the same failure branch as a
	// fetch error rather than throwing out of render.
	const schema = schemaQuery.data;
	const indexed = useMemo(() => {
		if (!schema) return null;
		try {
			return { index: createSchemaIndex(schema), error: null };
		} catch (err) {
			return { index: null, error: err };
		}
	}, [schema]);

	if (projectsQuery.isLoading) {
		return (
			<div className={styles.gate}>
				<LoadingState message="Loading" />
			</div>
		);
	}

	// Nothing open: first run with the sample removed, or the open project was
	// just taken off the list. The project list is where one gets chosen.
	if (projectsQuery.data && !hasProject) {
		return <Navigate to="/projects" replace />;
	}

	if (!projectsQuery.error && (configQuery.isLoading || schemaQuery.isLoading)) {
		return (
			<div className={styles.gate}>
				<LoadingState message="Loading project" />
			</div>
		);
	}

	const error = projectsQuery.error ?? configQuery.error ?? schemaQuery.error ?? indexed?.error;
	if (error || !configQuery.data || !schemaQuery.data || !indexed?.index) {
		const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
		return (
			<div className={styles.gate}>
				<EmptyState
					icon="triangle-alert"
					title="The project could not be loaded"
					message={message}
					actionLabel="All projects"
					actionTo="/projects"
				/>
			</div>
		);
	}

	return (
		<ProjectContext.Provider
			value={{ config: configQuery.data, schema: schemaQuery.data, schemaIndex: indexed.index }}
		>
			{children}
		</ProjectContext.Provider>
	);
}
