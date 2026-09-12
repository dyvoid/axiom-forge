import { ChipField } from './ChipField.js';

interface TagFilterProps {
	availableTags: string[];
	selectedTags: string[];
	onChange: (tags: string[]) => void;
}

export function TagFilter({ availableTags, selectedTags, onChange }: TagFilterProps): JSX.Element {
	const unselected = availableTags.filter((t) => !selectedTags.includes(t));

	// No `onAddRaw`: filtering by a tag nothing carries would only ever
	// produce an empty index.
	return (
		<ChipField
			chips={selectedTags.map((tag) => ({ id: tag, label: tag }))}
			options={unselected.map((tag) => ({ id: tag, label: tag }))}
			onAdd={(option) => onChange([...selectedTags, option.id])}
			onRemove={(id) => onChange(selectedTags.filter((t) => t !== id))}
			onClearAll={() => onChange([])}
			leadingIcon="tag"
			placeholder="filter by tags…"
			ariaLabel="Filter by tags"
		/>
	);
}
