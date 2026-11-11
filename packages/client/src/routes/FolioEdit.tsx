import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { ParsedFolio } from '@axiom-forge/shared';
import { useFolio, useSaveFolio, useDeleteFolio } from '../api/queries.js';
import { ConflictError, uploadCoverImage } from '../api/client.js';
import { useProject } from '../context/ProjectContext.js';
import { FolioEditView } from '../components/folio/FolioEditView.js';
import { FolioEmptyState } from '../components/folio/FolioEmptyState.js';
import { UnknownTypeNotice } from '../components/folio/UnknownTypeNotice.js';
import { LoadingState } from '../components/ui/LoadingState.js';
import editStyles from '../components/folio/FolioEditView.module.css';

export function FolioEdit(): JSX.Element {
	const { folder, name } = useParams<{ folder: string; name: string }>();
	const navigate = useNavigate();
	const location = useLocation();
	const { schema } = useProject();
	const { data: folio, isLoading, error } = useFolio(folder ?? '', name ?? '');
	const saveMutation = useSaveFolio(folder ?? '', name ?? '');
	const deleteMutation = useDeleteFolio();
	// FolioNew hands over a cover-upload failure when it lands here.
	const handedOver = (location.state as { saveError?: string } | null)?.saveError;
	const [saveError, setSaveError] = useState<string | null>(handedOver ?? null);
	const [uploading, setUploading] = useState(false);

	// Read it once: history keeps `state`, so a reload or Back would show it again.
	useEffect(() => {
		if (handedOver) navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
	}, [handedOver, location.pathname, location.search, navigate]);

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
		return <UnknownTypeNotice type={folio.type} />;
	}

	async function handleSave(
		draft: ParsedFolio,
		coverFile: File | null,
		onSaved: () => void,
		seededMtime: number | undefined,
	): Promise<void> {
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
			{ folio: next, clientMtime: seededMtime ?? folio!.mtime },
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
							'This file changed on disk since you opened it, so nothing was saved. Copy out what you need, then reopen the folio to edit the current version.',
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
			// The draft is seeded once, so a different folio needs a fresh editor.
			key={`${folio.folder}/${folio.name}`}
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
