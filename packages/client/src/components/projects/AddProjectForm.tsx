import { useId, useState, type FormEvent } from 'react';
import { NotAProjectError } from '../../api/client.js';
import { useAddProject } from '../../api/queries.js';
import { Callout } from '../ui/Callout.js';
import styles from './projects.module.css';

interface Props {
	/** Called once the folder has been added and opened. */
	onOpened: () => void;
}

/** A path the reader will recognise the shape of on their own machine. */
function examplePath(): string {
	const platform = typeof navigator === 'undefined' ? '' : navigator.platform;
	if (/win/i.test(platform)) return 'C:\\Users\\you\\worlds\\my-world';
	if (/mac/i.test(platform)) return '/Users/you/worlds/my-world';
	return '/home/you/worlds/my-world';
}

/** "…/worlds/my-world/" → "My world": a starting point for the new project's name. */
function nameFromPath(path: string): string {
	const leaf = path.replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? '';
	const words = leaf.replace(/[-_]+/g, ' ').trim();
	return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Adds a folder to the project list. One field does both jobs: a folder that
 * already holds a project is opened; one that holds none is offered as the
 * place to start a new one, which takes a name and nothing else.
 */
export function AddProjectForm({ onOpened }: Props): JSX.Element {
	const add = useAddProject();
	const [path, setPath] = useState('');
	/** Set once the server has said this folder holds no project yet. */
	const [createIn, setCreateIn] = useState<string | null>(null);
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [error, setError] = useState<string | null>(null);
	const id = useId();

	function fail(err: unknown): void {
		setError(err instanceof Error ? err.message : String(err));
	}

	function handleAdd(e: FormEvent): void {
		e.preventDefault();
		setError(null);
		add.mutate({ path }, {
			onSuccess: onOpened,
			onError: (err) => {
				if (!(err instanceof NotAProjectError)) return fail(err);
				if (!err.canCreate) {
					return setError(
						'That folder has only one of config.json and schema.json, so it is neither a project nor free to start one in. '
						+ 'Restore the missing file, or choose another folder.',
					);
				}
				setCreateIn(err.path);
				setName(nameFromPath(err.path));
			},
		});
	}

	function handleCreate(e: FormEvent): void {
		e.preventDefault();
		setError(null);
		add.mutate({ path: createIn!, create: { name, description } }, { onSuccess: onOpened, onError: fail });
	}

	function backToPath(): void {
		setCreateIn(null);
		setError(null);
	}

	return (
		<section className={styles.add} aria-labelledby={`${id}-title`}>
			<h2 className={styles.addTitle} id={`${id}-title`}>Add a project</h2>

			{createIn === null ? (
				<form className={styles.addForm} onSubmit={handleAdd}>
					<p className={styles.addHelp}>
						Give the full path of a folder. One that already holds a project is opened; an empty or
						new one becomes a new project. A browser cannot browse your folders, so paste the path
						or type it; <code>~</code> stands for your home folder.
					</p>
					<div className={styles.pathRow}>
						<input
							className={styles.inputPath}
							value={path}
							onChange={(e) => setPath(e.target.value)}
							placeholder={examplePath()}
							aria-label="Folder path"
							autoComplete="off"
							spellCheck={false}
						/>
						<button type="submit" className={styles.btnAdd} disabled={add.isPending || !path.trim()}>
							{add.isPending ? 'Opening…' : 'Add project'}
						</button>
					</div>
				</form>
			) : (
				<form className={styles.addForm} onSubmit={handleCreate}>
					<p className={styles.createNote}>
						There is no project in <code>{createIn}</code> yet. Name it to start one there: the
						folder gets a <code>config.json</code> and a starter <code>schema.json</code> with one
						type, which you can reshape as the world takes form.
					</p>
					<div className={styles.fieldRow}>
						<label className={styles.fieldLabel} htmlFor={`${id}-name`}>Name</label>
						<input
							id={`${id}-name`}
							className={styles.input}
							value={name}
							onChange={(e) => setName(e.target.value)}
							autoFocus
							required
						/>
					</div>
					<div className={styles.fieldRow}>
						<label className={styles.fieldLabel} htmlFor={`${id}-description`}>Description</label>
						<input
							id={`${id}-description`}
							className={styles.input}
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="A line for the title page"
						/>
					</div>
					<div className={styles.formActions}>
						<button type="button" className={styles.btn} onClick={backToPath} disabled={add.isPending}>
							Choose another folder
						</button>
						<button type="submit" className={styles.btnSave} disabled={add.isPending || !name.trim()}>
							{add.isPending ? 'Starting…' : 'Start project'}
						</button>
					</div>
				</form>
			)}

			{error && (
				<Callout label="Not added" role="alert" className={styles.notice}>{error}</Callout>
			)}
		</section>
	);
}
