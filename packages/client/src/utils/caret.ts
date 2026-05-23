// Standard properties to copy to the shadow div for accurate measurement
const properties = [
	'direction',
	'boxSizing',
	'width',
	'height',
	'overflowX',
	'overflowY',
	'borderTopWidth',
	'borderRightWidth',
	'borderBottomWidth',
	'borderLeftWidth',
	'borderStyle',
	'paddingTop',
	'paddingRight',
	'paddingBottom',
	'paddingLeft',
	'fontStyle',
	'fontVariant',
	'fontWeight',
	'fontStretch',
	'fontSize',
	'fontSizeAdjust',
	'lineHeight',
	'fontFamily',
	'textAlign',
	'textTransform',
	'textIndent',
	'textDecoration',
	'letterSpacing',
	'wordSpacing',
	'tabSize',
	'MozTabSize',
] as const;

interface Coordinates {
	top: number;
	left: number;
	height: number;
}

/**
 * Calculates the X/Y pixel coordinates of a character in a textarea.
 * Uses a hidden mirror div technique.
 */
export function getCaretCoordinates(element: HTMLTextAreaElement, position: number): Coordinates {
	const div = document.createElement('div');
	document.body.appendChild(div);

	const style = div.style;
	const computed = window.getComputedStyle(element);

	style.whiteSpace = 'pre-wrap';
	style.wordWrap = 'break-word';
	style.position = 'absolute';
	style.visibility = 'hidden';

	properties.forEach((prop) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		style[prop as any] = computed[prop as any];
	});

	// Handle Firefox textarea bug where scrolling affects calculation
	if ('mozInnerScreenX' in window) {
		if (element.scrollHeight > parseInt(computed.height)) {
			style.overflowY = 'scroll';
		}
	} else {
		style.overflow = 'hidden';
	}

	div.textContent = element.value.substring(0, position);
	const span = document.createElement('span');
	span.textContent = element.value.substring(position) || '.';
	div.appendChild(span);

	const coordinates = {
		top: span.offsetTop + parseInt(computed.borderTopWidth),
		left: span.offsetLeft + parseInt(computed.borderLeftWidth),
		height: parseInt(computed.lineHeight),
	};

	document.body.removeChild(div);
	return coordinates;
}
