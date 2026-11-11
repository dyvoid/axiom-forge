import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * The selected tags of an index view, kept in the URL as `?tags=a,b` so a
 * filtered index can be linked to: a folio's tag links land on
 * `/index?tags=…`. Other query parameters are left alone.
 */
export function useTagFilterParams(): [tags: string[], setTags: (tags: string[]) => void] {
	const [searchParams, setSearchParams] = useSearchParams();
	const raw = searchParams.get('tags') ?? '';

	const tags = useMemo(() => raw.split(',').filter(Boolean), [raw]);

	const setTags = useCallback((next: string[]) => {
		setSearchParams((prev) => {
			const params = new URLSearchParams(prev);
			if (next.length > 0) params.set('tags', next.join(','));
			else params.delete('tags');
			return params;
		});
	}, [setSearchParams]);

	return [tags, setTags];
}
