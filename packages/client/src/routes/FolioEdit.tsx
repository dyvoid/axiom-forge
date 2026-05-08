import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ParsedFolio } from '@axiom-forge/shared';
import { useFolio, useSaveFolio, useDeleteFolio } from '../api/queries.js';
import { ConflictError } from '../api/client.js';
import { useProject } from '../context/ProjectContext.js';
import { FolioEditView } from '../components/folio/FolioEditView.js';

export function FolioEdit(): JSX.Element {
	const { folder, name } = useParams<{ folder: string; name: string }>();
	const navigate = useNavigate();
	const { schema } = useProject();
	const { data: folio, isLoading, error } = useFolio(folder ?? '', name ?? '');
	const saveMutation = useSaveFolio(folder ?? '', name ?? '');
	const deleteMutation = useDeleteFolio();
	const [saveError, setSaveError] = useState<string | null>(null);

	if (isLoading) {
		return (
			<div style={{ padding: '2rem', color: 'var(--text-muted)' }}>
				Loading folio…
			</div>
		);
	}

	if (error || !folio) {
		return (
			<div style={{ padding: '2rem', color: 'var(--accent-rust)' }}>
				Folio not found.
			</div>
		);
	}

	const typeDef = schema.types[folio.type];
	if (!typeDef) {
		return (
			<div style={{ padding: '2rem', color: 'var(--accent-rust)' }}>
				Unknown type: {folio.type}
			</div>
		);
	}

	function handleSave(draft: ParsedFolio): void {
		setSaveError(null);
		saveMutation.mutate(
			{ folio: draft, clientMtime: folio!.mtime },
			{
				onSuccess: () => {
					navigate(`/folio/${encodeURIComponent(folio!.folder)}/${encodeURIComponent(folio!.name)}`);
				},
				onError: (err) => {
					if (err instanceof ConflictError) {
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

	function handleDelete(): void {
		deleteMutation.mutate(
			{ folder: folio!.folder, name: folio!.name },
			{
				onSuccess: () => {
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
			saving={saveMutation.isPending}
			deleting={deleteMutation.isPending}
			saveError={saveError}
			onSave={handleSave}
			onDelete={handleDelete}
		/>
	);
}
