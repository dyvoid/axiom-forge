import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ParsedFolio } from '@axiom-forge/shared';
import { useCreateFolio } from '../api/queries.js';
import { putFolio, uploadCoverImage } from '../api/client.js';
import { useProject } from '../context/ProjectContext.js';
import { FolioEditView } from '../components/folio/FolioEditView.js';
import { FolioEmptyState } from '../components/folio/FolioEmptyState.js';
import editStyles from '../components/folio/FolioEditView.module.css';

/**
 * Editor for a folio that does not exist on disk yet.
 *
 * Creation used to happen the moment a title was submitted, so discarding from
 * the editor left an empty file behind. Here the draft lives only in component
 * state: Save creates it, Discard writes nothing.
 */
export function FolioNew(): JSX.Element {
	const { folder } = useParams<{ folder: string }>();
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { schema, schemaIndex } = useProject();
	const createFolio = useCreateFolio({ navigateOnSuccess: false });
	const [saveError, setSaveError] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);

	const typeKey = folder ? schemaIndex.typeKeyForFolder(folder) : undefined;
	const title = searchParams.get('title')?.trim() ?? '';

	const draft = useMemo<ParsedFolio | null>(
		() => (folder && typeKey ? { name: '', title, type: typeKey, folder, tags: [], sections: {} } : null),
		[folder, typeKey, title],
	);

	if (!folder || !typeKey || !draft) return <FolioEmptyState />;

	const typeDef = schema.types[typeKey];
	if (!typeDef) {
		return (
			<div className={editStyles.container}>
				<p className={`${editStyles.footerStatus} ${editStyles.dirty}`}>Unknown type: {typeKey}</p>
			</div>
		);
	}

	async function handleSave(next: ParsedFolio, coverFile: File | null, onSaved: () => void): Promise<void> {
		setSaveError(null);
		let created: { name: string; mtime: number };
		try {
			created = await createFolio.mutateAsync({ folder: folder!, folio: next });
		} catch (err) {
			setSaveError(err instanceof Error ? err.message : String(err));
			return;
		}

		const readView = `/folio/${encodeURIComponent(folder!)}/${encodeURIComponent(created.name)}`;
		if (!coverFile) {
			onSaved();
			navigate(readView);
			return;
		}

		// A cover is addressed by the folio's filename, which the server derives
		// from the title on create — so it can only be attached once the folio
		// exists. If that second step fails the folio is already on disk, so the
		// recoverable place to land is its editor, with no cover attached.
		setUploading(true);
		try {
			const coverImage = await uploadCoverImage(folder!, created.name, coverFile);
			await putFolio(folder!, created.name, { ...next, name: created.name, coverImage }, created.mtime);
			queryClient.invalidateQueries({ queryKey: ['folios'] });
			onSaved();
			navigate(readView);
		} catch (err) {
			setSaveError(err instanceof Error ? err.message : String(err));
			onSaved();
			navigate(`${readView}/edit`);
		} finally {
			setUploading(false);
		}
	}

	return (
		<FolioEditView
			folio={draft}
			typeDef={typeDef}
			saving={createFolio.isPending || uploading}
			deleting={false}
			saveError={saveError}
			isNew
			onSave={handleSave}
			onDelete={() => undefined}
		/>
	);
}
