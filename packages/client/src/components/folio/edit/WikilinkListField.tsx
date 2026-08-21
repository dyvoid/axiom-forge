import type { WikiLink } from '@axiom-forge/shared';
import { WikiLinkPicker } from './WikiLinkPicker.js';
import { useProject } from '../../../context/ProjectContext.js';
import { Icon } from '../../ui/Icon.js';
import styles from './fields.module.css';

interface Props {
	value: WikiLink[];
	target?: string | string[];
	onChange: (next: WikiLink[]) => void;
	ariaLabel?: string;
}

/**
 * Wikilink list field — renders selected links as chips and provides
 * an inline WikiLinkPicker for adding more.
 */
export function WikilinkListField({ value, target, onChange, ariaLabel }: Props): JSX.Element {
	const { schema } = useProject();

	// Resolve icon for a folder
	function folderIcon(folder: string): string {
		const entry = Object.entries(schema.types).find(([, def]) => def.folder === folder);
		return entry?.[1].icon || 'circle';
	}

	return (
		<div className={styles.tagBox} role="group" aria-label={ariaLabel}>
			{value.map((link, i) => {
				const display = link.alias || link.name.replace(/_/g, ' ');
				return (
					<span key={`${link.folder}/${link.name}-${i}`} className={styles.chip}>
						<Icon name={folderIcon(link.folder)} size={10} />
						<span>{display}</span>
						<button
							type="button"
							className={styles.chipRemove}
							aria-label={`Remove ${display}`}
							onClick={() => onChange(value.filter((_, x) => x !== i))}
						>
							×
						</button>
					</span>
				);
			})}
			<WikiLinkPicker
				value={null}
				target={target}
				exclude={value}
				inline={true}
				placeholder={ariaLabel ? `Add ${ariaLabel.toLowerCase()}` : undefined}
				onChange={(next) => {
					if (next) onChange([...value, next]);
				}}
			/>
		</div>
	);
}
