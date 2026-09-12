import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ParsedFolio } from '@axiom-forge/shared';
import { useFolio, useSaveFolio, useDeleteFolio } from '../api/queries.js';
import { ConflictError, uploadCoverImage } from '../api/client.js';
import { useProject } from '../context/ProjectContext.js';
import { FolioEditView } from '../components/folio/FolioEditView.js';
import { FolioEmptyState } from '../components/folio/FolioEmptyState.js';
import { LoadingState } from '../components/ui/LoadingState.js';
import editStyles from '../components/folio/FolioEditView.module.css';

export function FolioEdit(): JSX.Element {
	const { folder, name } = useParams<{ folder: string; name: string }>();
	const navigate = useNavigate();
	const { schema } = useProject();
	const { data: folio, isLoading, error } = useFolio(folder ?? '', name ?? '');
	const saveMutation = useSaveFolio(folder ?? '', name ?? '');
	const deleteMutation = useDeleteFolio();
	const [saveError, setSaveError] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);

	if (isLoading) {
		return (
			<div className={editStyles.container}>
				<LoadingState message="Loading folio" />
			</div>
		);
	}

	if (error || !folio) {
		return <FolioEmptyState />;
	}

	const typeDef = schema.types[folio.type];
	if (!typeDef) {
		return (
			<div className={editStyles.container}>
				<p className={`${editStyles.footerStatus} ${editStyles.dirty}`}>Unknown type: {folio.type}</p>
			</div>
		);
	}

	async function handleSave(draft: ParsedFolio, coverFile: File | null, onSaved: () => void): Promise<void> {
		setSaveError(null);
		setUploading(Boolean(coverFile));
		let next = draft;
		try {
			if (coverFile) {
				const coverImage = await uploadCoverImage(folio!.folder, folio!.name, coverFile);
				next = { ...draft, coverImage };
			}
		} catch (err) {
			setUploading(false);
			setSaveError(err instanceof Error ? err.message : String(err));
			return;
		}
		setUploading(false);
		saveMutation.mutate(
			{ folio: next, clientMtime: folio!.mtime },
			{
				onSuccess: (response) => {
					onSaved();
					// If the server renamed the file (H1 changed), navigate to
					// the new URL; otherwise back to the original read view.
					const targetName = response.renamedTo ?? folio!.name;
					navigate(`/folio/${encodeURIComponent(folio!.folder)}/${encodeURIComponent(targetName)}`);
				},
				onError: (err) => {
					if (err instanceof ConflictError && err.staleLinkFile) {
						setSaveError(
							`Rename cancelled: “${err.staleLinkFile}” links to this folio and changed on disk, ` +
								'so its links were not rewritten. Nothing was saved — sync the project, then try again.',
						);
					} else if (err instanceof ConflictError) {
						setSaveError(
							'This file changed on disk since you opened it. Reload the folio to merge — your edits are still in the form.',
						);
					} else {
						setSaveError(err instanceof Error ? err.message : String(err));
					}
				},
			},
		);
	}

	function handleDelete(deleteCoverImage: boolean, onDeleted: () => void): void {
		deleteMutation.mutate(
			{ folder: folio!.folder, name: folio!.name, deleteCoverImage },
			{
				onSuccess: () => {
					onDeleted();
					navigate(`/folio/${encodeURIComponent(folio!.folder)}`);
				},
				onError: (err) => {
					setSaveError(err instanceof Error ? err.message : String(err));
				},
			},
		);
	}

	return (
		<FolioEditView
			folio={folio}
			typeDef={typeDef}
			saving={saveMutation.isPending || uploading}
			deleting={deleteMutation.isPending}
			saveError={saveError}
			onSave={handleSave}
			onDelete={handleDelete}
		/>
	);
}
