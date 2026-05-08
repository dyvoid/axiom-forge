import type { WikiLink } from '@axiom-forge/shared';
import { TextField } from './TextField.js';

interface Props {
	value: WikiLink | null;
	target?: string;
	onChange: (next: WikiLink | null) => void;
}

/**
 * M1 stub: wikilink as plain text "Folder/Name". The wikilink picker
 * (autocomplete dropdown) replaces this in M3.
 */
export function WikilinkField({ value, target, onChange }: Props): JSX.Element {
	const text = value ? `${value.folder}/${value.name}` : '';
	const folder = target ?? value?.folder ?? '';

	return (
		<TextField
			value={text}
			placeholder={folder ? `${folder}/Name` : 'Folder/Name'}
			onChange={(raw) => {
				const trimmed = raw.trim();
				if (!trimmed) {
					onChange(null);
					return;
				}
				const slashIdx = trimmed.indexOf('/');
				if (slashIdx === -1) {
					// No folder — assume target
					onChange({ folder: folder, name: trimmed.replace(/\s+/g, '_') });
				} else {
					onChange({
						folder: trimmed.slice(0, slashIdx),
						name: trimmed.slice(slashIdx + 1).replace(/\s+/g, '_'),
					});
				}
			}}
		/>
	);
}
