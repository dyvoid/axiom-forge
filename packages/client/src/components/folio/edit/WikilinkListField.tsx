import type { WikiLink } from '@axiom-forge/shared';
import { WikiLinkPicker } from './WikiLinkPicker.js';
import { useProject } from '../../../context/ProjectContext.js';
import { Icon } from '../../ui/Icon.js';
import styles from './fields.module.css';

interface Props {
	value: WikiLink[];
	target?: string | string[];
	onChange: (next: WikiLink[]) => void;
}

/**
 * Wikilink list field — renders selected links as chips and provides
 * an inline WikiLinkPicker for adding more.
 */
export function WikilinkListField({ value, target, onChange }: Props): JSX.Element {
	const { schema } = useProject();

	// Resolve icon for a folder
	function folderIcon(folder: string): string {
		const entry = Object.entries(schema.types).find(([, def]) => def.folder === folder);
		return entry?.[1].icon || 'circle';
	}

	return (
		<div className={styles.tagBox}>
			{value.map((link, i) => (
				<span key={`${link.folder}/${link.name}-${i}`} className={styles.chip}>
					<Icon name={folderIcon(link.folder)} size={10} />
					<span>{link.alias || link.name.replace(/_/g, ' ')}</span>
					<button
						type="button"
						className={styles.chipRemove}
						onClick={() => onChange(value.filter((_, x) => x !== i))}
					>
						×
					</button>
				</span>
			))}
			<WikiLinkPicker
				value={null}
				target={target}
				exclude={value}
				inline={true}
				onChange={(next) => {
					if (next) onChange([...value, next]);
				}}
			/>
		</div>
	);
}
