/**
 * Projects route — every project this installation knows about (ADR-0023).
 *
 * The level above the landing page: where a project is opened, added,
 * renamed, or removed. It sits outside the project gate, so it is also what
 * the app shows when no project is open at all.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ProjectSummary } from '../api/client.js';
import { useProjects, useRemoveProject } from '../api/queries.js';
import { AddProjectForm } from '../components/projects/AddProjectForm.js';
import { ProjectRow } from '../components/projects/ProjectRow.js';
import projectStyles from '../components/projects/projects.module.css';
import { Callout } from '../components/ui/Callout.js';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.js';
import { EmptyState } from '../components/ui/EmptyState.js';
import { LoadingState } from '../components/ui/LoadingState.js';
import styles from './Projects.module.css';

/** Which confirmation is on screen, and for which project. */
type Removal = { project: ProjectSummary; step: 'choose' | 'delete' };

export function Projects(): JSX.Element {
	const navigate = useNavigate();
	const { data: library, isLoading, error } = useProjects();
	const remove = useRemoveProject();
	const [removal, setRemoval] = useState<Removal | null>(null);

	const projects = library?.projects ?? [];
	const open = projects.find((p) => p.id === library?.activeId);

	function handleOpen(project: ProjectSummary): void {
		// The open project needs no switch; any other goes through /open so a
		// failure to load has a page of its own to be reported on.
		navigate(project.id === library?.activeId ? '/' : `/open/${encodeURIComponent(project.id)}`);
	}

	function handleRemove(deleteFiles: boolean): void {
		if (!removal) return;
		const { project } = removal;
		setRemoval(null);
		remove.mutate({ id: project.id, deleteFiles, confirmName: deleteFiles ? project.name : undefined });
	}

	return (
		<div className={styles.page}>
			<div className={styles.corners}>
				<span className={styles.brand}>Axiom · Forge</span>
				{open && (
					<Link to="/" className={styles.back}>Return to {open.name} →</Link>
				)}
			</div>

			<main className={styles.container} id="main-content">
				<header className={styles.header}>
					<h1 className={styles.title}>Projects</h1>
					{library && (
						<p className={styles.count}>
							{projects.length} {projects.length === 1 ? 'project' : 'projects'}
						</p>
					)}
				</header>

				{remove.error && (
					<Callout label="Not removed" role="alert" className={styles.notice}>{remove.error.message}</Callout>
				)}

				{isLoading && <LoadingState message="Loading projects" />}

				{error && (
					<Callout label="The project list could not be loaded" className={styles.notice}>
						{error.message}
					</Callout>
				)}

				{library && projects.length === 0 && (
					<div className={styles.empty}>
						<EmptyState
							variant="inline"
							icon="book-open"
							message="No projects yet. Add a folder below to begin."
						/>
					</div>
				)}

				{projects.length > 0 && (
					<ul className={projectStyles.list}>
						{projects.map((project) => (
							<ProjectRow
								key={project.id}
								project={project}
								isOpen={project.id === library?.activeId}
								onOpen={() => handleOpen(project)}
								onRemove={() => setRemoval({ project, step: 'choose' })}
							/>
						))}
					</ul>
				)}

				{library && <AddProjectForm onOpened={() => navigate('/')} />}
			</main>

			{/* Removing only forgets the folder, so it is the default and needs
			    one click. Deleting is offered beside it, and asks again. */}
			<ConfirmDialog
				open={removal?.step === 'choose'}
				title="Remove project"
				message={removal
					? `Take “${removal.project.name}” off this list? Its folder and every file in it stay where they are, at ${removal.project.path}. You can add it again whenever you like.`
					: ''}
				confirmLabel="Remove from list"
				secondaryLabel={removal?.project.available ? 'Delete files…' : undefined}
				onCancel={() => setRemoval(null)}
				onSecondary={() => setRemoval((r) => r && { ...r, step: 'delete' })}
				onConfirm={() => handleRemove(false)}
			/>

			<ConfirmDialog
				open={removal?.step === 'delete'}
				title="Delete from disk"
				message={removal
					? `This deletes the folder ${removal.project.path} and everything in it: every entry, every image, and any other file kept there. It does not go to the trash and cannot be undone.`
					: ''}
				confirmLabel="Delete folder"
				danger
				requireText={removal?.project.name}
				requireTextLabel={removal ? `Type “${removal.project.name}” to confirm` : undefined}
				onCancel={() => setRemoval(null)}
				onConfirm={() => handleRemove(true)}
			/>
		</div>
	);
}
