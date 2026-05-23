import type { WikiLink } from '@axiom-forge/shared';
import { WikiLinkPicker } from './WikiLinkPicker.js';

interface Props {
	value: WikiLink | null;
	target?: string | string[];
	onChange: (next: WikiLink | null) => void;
}

/**
 * Single wikilink field — renders a WikiLinkPicker that constrains
 * selection to existing folios in the target folder.
 */
export function WikilinkField({ value, target, onChange }: Props): JSX.Element {
	return (
		<WikiLinkPicker
			value={value}
			target={target}
			onChange={onChange}
		/>
	);
}
