import { useParams } from 'react-router-dom';
import { useFolio } from '../api/queries.js';
import { FolioReadView } from '../components/folio/FolioReadView.js';
import { FolioSkeleton } from '../components/folio/FolioSkeleton.js';
import { FolioEmptyState } from '../components/folio/FolioEmptyState.js';

export function FolioRead(): JSX.Element {
	const { folder, name } = useParams<{ folder: string; name: string }>();
	const { data: folio, isLoading, error } = useFolio(folder ?? '', name ?? '');

	if (isLoading) {
		return <FolioSkeleton />;
	}

	if (error || !folio) {
		return <FolioEmptyState />;
	}

	return <FolioReadView folio={folio} />;
}
