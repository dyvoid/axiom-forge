/**
 * ProjectContext — loads config + schema once at boot and exposes via useProject().
 * Both are effectively immutable for the session.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
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

type LoadState =
	| { status: 'loading' }
	| { status: 'ok'; config: Config; schema: ProjectSchema }
	| { status: 'error'; message: string };

export function ProjectProvider({ children }: { children: ReactNode }): JSX.Element {
	const [state, setState] = useState<LoadState>({ status: 'loading' });

	useEffect(() => {
		let cancelled = false;
		Promise.all([fetchConfig(), fetchSchema()])
			.then(([config, schema]) => {
				if (!cancelled) setState({ status: 'ok', config, schema });
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setState({
						status: 'error',
						message: err instanceof Error ? err.message : String(err),
					});
				}
			});
		return () => { cancelled = true; };
	}, []);

	if (state.status === 'loading') {
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

	if (state.status === 'error') {
		return (
			<div style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				height: '100vh',
				fontFamily: 'var(--ff-body)',
				color: 'var(--accent-rust)',
			}}>
				Failed to load project: {state.message}
			</div>
		);
	}

	return (
		<ProjectContext.Provider value={{ config: state.config, schema: state.schema }}>
			{children}
		</ProjectContext.Provider>
	);
}
