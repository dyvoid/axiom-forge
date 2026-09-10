import { useEffect, useState } from 'react';
import type { CoverImage as CoverImageData } from '@axiom-forge/shared';
import { coverImageUrl } from '../../api/client.js';
import styles from './CoverImage.module.css';

interface CoverImageProps {
	cover: CoverImageData;
	folder: string;
	name: string;
}

export function CoverImage({ cover, folder, name }: CoverImageProps): JSX.Element | null {
	const [failed, setFailed] = useState(false);
	const src = coverImageUrl(folder, name);
	useEffect(() => setFailed(false), [src, cover.path]);
	if (failed) return null;
	return (
		<figure className={styles.figure}>
			<div className={styles.frame}>
				<img className={styles.image} src={src} alt={cover.alt ?? ''} onError={() => setFailed(true)} />
			</div>
			{cover.alt && <figcaption className={styles.caption}>{cover.alt}</figcaption>}
		</figure>
	);
}
