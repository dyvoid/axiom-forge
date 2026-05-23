import { useState, useRef, useEffect } from 'react';
import { type WikiLink } from '@axiom-forge/shared';
import { WikiLinkPicker } from './WikiLinkPicker.js';
import { getCaretCoordinates } from '../../../utils/caret.js';
import styles from './fields.module.css';

interface Props {
	value: string;
	onChange: (next: string) => void;
	placeholder?: string;
}

export function TextareaField({ value, onChange, placeholder }: Props): JSX.Element {
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [pickerState, setPickerState] = useState<{
		top: number;
		left: number;
		index: number;
	} | null>(null);

	// Dismiss picker on Escape or click outside
	useEffect(() => {
		if (!pickerState) return;

		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') {
				e.stopPropagation();
				setPickerState(null);
				setTimeout(() => textareaRef.current?.focus(), 0);
			}
		}

		function handlePointerDown(e: PointerEvent) {
			const target = e.target as HTMLElement;
			if (!target.closest(`.${styles.inlinePickerPopover}`)) {
				setPickerState(null);
			}
		}

		window.addEventListener('keydown', handleKeyDown, true);
		window.addEventListener('pointerdown', handlePointerDown, true);
		return () => {
			window.removeEventListener('keydown', handleKeyDown, true);
			window.removeEventListener('pointerdown', handlePointerDown, true);
		};
	}, [pickerState]);

	function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
		const val = e.target.value;
		onChange(val);

		const cursor = e.target.selectionStart;
		// Check if they just typed [[
		if (cursor >= 2 && val.substring(cursor - 2, cursor) === '[[') {
			const coords = getCaretCoordinates(e.target, cursor);
			setPickerState({
				top: coords.top + coords.height + 4, // spawn slightly below the cursor
				left: coords.left,
				index: cursor, // position right after the [[
			});
		} else if (pickerState) {
			// If they deleted the [[, dismiss
			if (cursor < pickerState.index - 2 || val.substring(pickerState.index - 2, pickerState.index) !== '[[') {
				setPickerState(null);
			}
		}
	}

	function handleLinkSelect(link: WikiLink | null) {
		if (!pickerState || !link) return;

		const before = value.substring(0, pickerState.index);
		const after = value.substring(pickerState.index);
		const insert = `${link.folder}/${link.name}]]`;
		const next = before + insert + after;
		
		const currentScrollTop = textareaRef.current?.scrollTop;
		
		onChange(next);
		setPickerState(null);

		setTimeout(() => {
			if (textareaRef.current) {
				textareaRef.current.focus();
				const newCursor = pickerState.index + insert.length;
				textareaRef.current.setSelectionRange(newCursor, newCursor);
				if (currentScrollTop !== undefined) {
					textareaRef.current.scrollTop = currentScrollTop;
				}
			}
		}, 0);
	}

	return (
		<div className={styles.textareaWrapper}>
			<textarea
				ref={textareaRef}
				className={styles.textarea}
				value={value}
				placeholder={placeholder}
				onChange={handleChange}
			/>
			{pickerState && (
				<div
					className={styles.inlinePickerPopover}
					style={{ top: pickerState.top, left: pickerState.left }}
				>
					<WikiLinkPicker
						value={null}
						autoFocus={true}
						onChange={handleLinkSelect}
					/>
				</div>
			)}
		</div>
	);
}
