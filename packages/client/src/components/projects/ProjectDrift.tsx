import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { getWindowProject, onProjectChanged } from '../../api/client.js';
import { adoptLibrary, openProject, useProjects } from '../../api/queries.js';
import { ConfirmDialog } from '../ui/ConfirmDialog.js';

/**
 * Notices when the server's open project is no longer the one this window is
 * showing: another window switched, or the server restarted on a different
 * project.
 *
 * There is one open project for the whole app (ADR-0023), so this window can
 * no longer read or save what it has on screen. It must not quietly follow
 * the switch either: that would replace the page under the user, and throw
 * away an unsaved draft. So the page is left exactly as it is, and the user
 * chooses: bring this project back, or go to the other one.
 */
export function ProjectDrift(): null | JSX.Element {
	const qc = useQueryClient();
	const navigate = useNavigate();
	const { data: library } = useProjects();
	const [dismissed, setDismissed] = useState<string | null | undefined>(undefined);
	const [error, setError] = useState<string | null>(null);

	// A refused request is the server saying the project changed: fetch the list to learn to what.
	useEffect(
		() => onProjectChanged(() => {
			setDismissed(undefined);
			void qc.invalidateQueries({ queryKey: ['projects'] });
		}),
		[qc],
	);

	const mine = getWindowProject();
	const drifted = library !== undefined && library.activeId !== mine;
	const ours = library?.projects.find((p) => p.id === mine && p.available);
	const theirs = library?.projects.find((p) => p.id === library.activeId);

	// Nothing on screen to protect: this window showed no project, or the one
	// it showed has been removed. Follow the server.
	const follow = drifted && !ours;
	useEffect(() => {
		if (follow && library) void adoptLibrary(qc, library);
	}, [follow, library, qc]);

	if (!drifted || !ours || dismissed === library.activeId) return null;

	function reopenHere(): void {
		setError(null);
		openProject(qc, ours!.id).catch((err: unknown) => {
			setError(err instanceof Error ? err.message : String(err));
		});
	}

	const elsewhere = theirs ? `“${theirs.name}” was opened` : 'This project was closed';
	const message = `${elsewhere} in another window. Axiom Forge keeps one project open at a time, so this window `
		+ `cannot load or save “${ours.name}” until it is open again. Nothing here has been lost.`
		+ (error ? ` Reopening failed: ${error}` : '');

	return (
		<ConfirmDialog
			open
			title="Project changed elsewhere"
			message={message}
			confirmLabel="Reopen it here"
			secondaryLabel={theirs ? 'Switch this window too' : undefined}
			onConfirm={reopenHere}
			onSecondary={() => {
				// Through /open, so an editor with unsaved changes gets to ask
				// first. Step aside for that question; if the answer is to stay,
				// the next refused save brings this one back.
				setDismissed(library.activeId);
				navigate(`/open/${encodeURIComponent(theirs!.id)}`);
			}}
			onCancel={() => setDismissed(library.activeId)}
		/>
	);
}
