/**
 * ProjectContext — exposes the project's config + schema via useProject().
 *
 * Both are fetched through TanStack Query so the Sync button's
 * `queryClient.invalidateQueries()` causes them to refetch alongside the
 * folio index. Otherwise schema edits on disk would silently desync the
 * client until a full page reload.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createSchemaIndex, type Config, type ProjectSchema, type SchemaIndex } from '@axiom-forge/shared';
import { fetchConfig, fetchSchema } from '../api/client.js';
import { LoadingState } from '../components/ui/LoadingState.js';
import styles from './ProjectContext.module.css';

interface ProjectContextValue {
	config: Config;
	schema: ProjectSchema;
	/** Pre-computed schema lookups (ADR-0019) — rebuilt whenever the schema refetches. */
	schemaIndex: SchemaIndex;
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

	if (configQuery.isLoading || schemaQuery.isLoading) {
		return (
			<div className={styles.gate}>
				<LoadingState message="Loading project" />
			</div>
		);
	}

	const error = configQuery.error ?? schemaQuery.error ?? indexed?.error;
	if (error || !configQuery.data || !schemaQuery.data || !indexed?.index) {
		const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
		return (
			<div className={styles.gate}>
				<p className={styles.failure}>Failed to load project: {message}</p>
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
