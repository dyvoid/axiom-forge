import { useParams } from 'react-router-dom';
import { useFolio } from '../api/queries.js';
import { FolioReadView } from '../components/folio/FolioReadView.js';

export function FolioRead(): JSX.Element {
	const { folder, name } = useParams<{ folder: string; name: string }>();
	const { data: folio, isLoading, error } = useFolio(folder ?? '', name ?? '');

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

	return <FolioReadView folio={folio} />;
}
