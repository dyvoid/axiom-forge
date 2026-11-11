import { useState } from 'react';
import type { ProjectSummary } from '../../api/client.js';
import { ProjectSettingsForm } from './ProjectSettingsForm.js';
import styles from './projects.module.css';

interface Props {
	project: ProjectSummary;
	/** This is the project the app has open. */
	isOpen: boolean;
	onOpen: () => void;
	onRemove: () => void;
}

/** One project in the list: what it is, where it lives, and what can be done with it. */
export function ProjectRow({ project, isOpen, onOpen, onRemove }: Props): JSX.Element {
	const [editing, setEditing] = useState(false);

	return (
		<li className={styles.row}>
			<div className={styles.rowMain}>
				<div className={styles.heading}>
					<button type="button" className={styles.name} onClick={onOpen} disabled={!project.available}>
						{project.name}
					</button>
					{isOpen && <span className={styles.openMark}>Open now</span>}
				</div>
				{project.description && <p className={styles.description}>{project.description}</p>}
				<p className={styles.path}>{project.path}</p>
				{project.problem && <p className={styles.problem}>{project.problem}</p>}
			</div>

			<div className={styles.actions}>
				<button
					type="button"
					className={styles.btnOpen}
					onClick={onOpen}
					disabled={!project.available}
					aria-label={`Open ${project.name}`}
				>
					{isOpen ? 'Return' : 'Open'}
				</button>
				<button
					type="button"
					className={styles.btn}
					onClick={() => setEditing((e) => !e)}
					disabled={!project.available}
					aria-expanded={editing}
					aria-label={`Settings for ${project.name}`}
				>
					Settings
				</button>
				<button type="button" className={styles.btn} onClick={onRemove} aria-label={`Remove ${project.name}`}>
					Remove
				</button>
			</div>

			{editing && <ProjectSettingsForm project={project} onDone={() => setEditing(false)} />}
		</li>
	);
}
