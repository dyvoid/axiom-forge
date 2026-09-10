import { useEffect, useState, type DragEvent } from 'react';
import type { CoverImage } from '@axiom-forge/shared';
import { coverImageUrl } from '../../../api/client.js';
import styles from './CoverImageEditor.module.css';

interface CoverImageEditorProps {
	cover: CoverImage | undefined;
	folder: string;
	name: string;
	pendingFile: File | null;
	onChange: (cover: CoverImage | undefined, file: File | null) => void;
	onError: (message: string) => void;
}

const acceptedExtensions = /\.(?:png|jpe?g|webp|gif)$/i;

export function CoverImageEditor({
	cover,
	folder,
	name,
	pendingFile,
	onChange,
	onError,
}: CoverImageEditorProps): JSX.Element {
	const [dragging, setDragging] = useState(false);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!pendingFile) {
			setPreviewUrl(null);
			return;
		}
		const url = URL.createObjectURL(pendingFile);
		setPreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [pendingFile]);

	function choose(file: File | undefined): void {
		if (!file) return;
		if (!acceptedExtensions.test(file.name) || !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
			onError('Choose a PNG, JPG, JPEG, WebP, or GIF image.');
			return;
		}
		if (file.size > 10 * 1024 * 1024) {
			onError('Cover images must be 10 MB or smaller.');
			return;
		}
		onError('');
		onChange({ path: `Images/${file.name}`, syntax: 'wikilink' }, file);
	}

	function handleDrop(event: DragEvent<HTMLLabelElement>): void {
		event.preventDefault();
		setDragging(false);
		choose(event.dataTransfer.files[0]);
	}

	const src = previewUrl ?? (cover ? coverImageUrl(folder, name) : null);

	return (
		<section className={styles.section}>
			<div className={styles.header}>
				<span>Cover image</span>
				{cover && (
					<button type="button" className={styles.remove} onClick={() => onChange(undefined, null)}>
						Remove from folio
					</button>
				)}
			</div>
			<label
				className={`${styles.dropzone} ${dragging ? styles.dragging : ''}`}
				onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
				onDragOver={(event) => event.preventDefault()}
				onDragLeave={() => setDragging(false)}
				onDrop={handleDrop}
			>
				<input
					className={styles.input}
					type="file"
					accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
					onChange={(event) => choose(event.target.files?.[0])}
				/>
				{src ? (
					<div className={styles.previewRow}>
						<span className={styles.previewFrame}><img src={src} alt="" /></span>
						<span>
							<strong>{pendingFile ? pendingFile.name : cover?.path}</strong>
							<small>Drop or click to replace</small>
						</span>
					</div>
				) : (
					<span>
						<strong>Drop an image here</strong>
						<small>or click to choose · PNG, JPG, WebP, GIF · up to 10 MB</small>
					</span>
				)}
			</label>
		</section>
	);
}
