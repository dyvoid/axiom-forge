/**
 * FolioRead route — placeholder for now, will be fleshed out next.
 */

import { useParams } from 'react-router-dom';
import { useFolio } from '../api/queries.js';
import { FolioReadView } from '../components/folio/FolioReadView.js';

export function FolioRead(): JSX.Element {
	const { type, name } = useParams<{ type: string; name: string }>();
	const { data: folio, isLoading, error } = useFolio(type ?? '', name ?? '');

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
