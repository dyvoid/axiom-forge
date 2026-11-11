import { useId, useState, type FormEvent } from 'react';
import type { ProjectSettings, ProjectSummary } from '../../api/client.js';
import { useUpdateProject } from '../../api/queries.js';
import { Callout } from '../ui/Callout.js';
import styles from './projects.module.css';

interface Props {
	project: ProjectSummary;
	onDone: () => void;
}

/** Edits the three fields of a project's `config.json`, in place under its row. */
export function ProjectSettingsForm({ project, onDone }: Props): JSX.Element {
	const update = useUpdateProject();
	const [settings, setSettings] = useState<Required<ProjectSettings>>({
		name: project.name,
		description: project.description ?? '',
		version: project.version ?? '',
	});
	const id = useId();

	const set = (key: keyof ProjectSettings) => (e: { target: { value: string } }) =>
		setSettings((current) => ({ ...current, [key]: e.target.value }));

	function handleSubmit(e: FormEvent): void {
		e.preventDefault();
		update.mutate({ id: project.id, settings }, { onSuccess: onDone });
	}

	return (
		<form className={styles.form} onSubmit={handleSubmit} aria-label={`Settings for ${project.name}`}>
			<div className={styles.fieldRow}>
				<label className={styles.fieldLabel} htmlFor={`${id}-name`}>Name</label>
				<input
					id={`${id}-name`}
					className={styles.input}
					value={settings.name}
					onChange={set('name')}
					autoFocus
					required
				/>
			</div>
			<div className={styles.fieldRow}>
				<label className={styles.fieldLabel} htmlFor={`${id}-description`}>Description</label>
				<input
					id={`${id}-description`}
					className={styles.input}
					value={settings.description}
					onChange={set('description')}
					placeholder="A line for the title page"
				/>
			</div>
			<div className={styles.fieldRow}>
				<label className={styles.fieldLabel} htmlFor={`${id}-version`}>Version</label>
				<input
					id={`${id}-version`}
					className={styles.input}
					value={settings.version}
					onChange={set('version')}
					placeholder="1.0.0"
				/>
			</div>

			{update.error && (
				<Callout label="Not saved" role="alert">{update.error.message}</Callout>
			)}

			<div className={styles.formActions}>
				<button type="button" className={styles.btn} onClick={onDone} disabled={update.isPending}>
					Cancel
				</button>
				<button type="submit" className={styles.btnSave} disabled={update.isPending || !settings.name.trim()}>
					Save settings
				</button>
			</div>
		</form>
	);
}
