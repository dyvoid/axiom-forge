/**
 * Opens the project named in the URL, then lands on its home page.
 *
 * Switching is a route rather than a button's side effect so that it passes
 * through the router like any other navigation: an editor with unsaved
 * changes gets to ask first, and a project that fails to load has somewhere
 * to say why.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { openProject } from '../api/queries.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { LoadingState } from '../components/ui/LoadingState.js';
import styles from '../context/ProjectContext.module.css';

export function ProjectOpen(): JSX.Element {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [error, setError] = useState<string | null>(null);
	const requested = useRef<string | null>(null);

	useEffect(() => {
		// Once per id: StrictMode runs effects twice, and opening is a POST.
		if (!id || requested.current === id) return;
		requested.current = id;
		setError(null);
		openProject(queryClient, id).then(
			() => navigate('/', { replace: true }),
			(err: unknown) => setError(err instanceof Error ? err.message : String(err)),
		);
	}, [id, queryClient, navigate]);

	return (
		<div className={styles.gate}>
			{error ? (
				<EmptyState
					icon="triangle-alert"
					title="That project could not be opened"
					message={`${error}. Nothing else was changed.`}
					actionLabel="All projects"
					actionTo="/projects"
				/>
			) : (
				<LoadingState message="Opening project" />
			)}
		</div>
	);
}
