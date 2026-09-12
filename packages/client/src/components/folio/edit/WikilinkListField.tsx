import { scoreFolio, wikiLinkDisplayName } from '@axiom-forge/shared';
import type { FolioIndexRecord, WikiLink } from '@axiom-forge/shared';
import { useFolios } from '../../../api/queries.js';
import { useProject } from '../../../context/ProjectContext.js';
import { parseWikiLinkText } from '../../../utils/links.js';
import { ChipField, type ChipOption } from '../../ui/ChipField.js';

interface Props {
	value: WikiLink[];
	target?: string | string[];
	onChange: (next: WikiLink[]) => void;
	ariaLabel?: string;
}

function linkId(link: WikiLink): string {
	return `${link.folder}/${link.name}`;
}

function parseId(id: string): WikiLink {
	const slash = id.indexOf('/');
	return { folder: id.slice(0, slash), name: id.slice(slash + 1) };
}

export function WikilinkListField({ value, target, onChange, ariaLabel }: Props): JSX.Element {
	const { schemaIndex } = useProject();
	const { data: folios } = useFolios();

	function folderIcon(folder: string): string {
		return schemaIndex.typeDefForFolder(folder)?.icon || 'circle';
	}

	const selected = new Set(value.map(linkId));
	const showFolder = !target || (Array.isArray(target) && target.length > 1);

	const candidates = (folios ?? []).filter((f) => {
		if (target) {
			if (Array.isArray(target) ? !target.includes(f.folder) : f.folder !== target) return false;
		}
		return !selected.has(`${f.folder}/${f.name}`);
	});

	const byId = new Map<string, FolioIndexRecord>(candidates.map((f) => [`${f.folder}/${f.name}`, f]));

	const options: ChipOption[] = candidates.map((f) => ({
		id: `${f.folder}/${f.name}`,
		label: f.title,
		icon: folderIcon(f.folder),
		meta: showFolder ? f.folder : undefined,
	}));

	function add(link: WikiLink): void {
		if (!selected.has(linkId(link))) onChange([...value, link]);
	}

	return (
		<ChipField
			chips={value.map((link) => ({
				id: linkId(link),
				label: wikiLinkDisplayName(link),
				icon: folderIcon(link.folder),
			}))}
			options={options}
			// Rank through the shared scorer so this matches the header search and
			// both indexes — including aliases, which a substring match misses.
			score={(option, query) => {
				const folio = byId.get(option.id);
				return folio ? scoreFolio(folio, query) : 0;
			}}
			onAdd={(option) => add(parseId(option.id))}
			onAddRaw={(raw) => {
				const link = parseWikiLinkText(raw, target);
				if (link) add(link);
			}}
			onRemove={(id) => onChange(value.filter((link) => linkId(link) !== id))}
			ariaLabel={ariaLabel}
		/>
	);
}
