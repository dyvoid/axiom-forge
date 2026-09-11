// Standard properties to copy to the shadow div for accurate measurement.
// Spelled as CSS property names rather than camelCase JS keys so they can go
// through getPropertyValue/setProperty, which is the only typed way to reach a
// vendor-prefixed property (-moz-tab-size) — CSSStyleDeclaration declares no
// named key for it, and indexing it by string falls back to a numeric-only
// index signature.
const properties = [
	'direction',
	'box-sizing',
	'width',
	'height',
	'overflow-x',
	'overflow-y',
	'border-top-width',
	'border-right-width',
	'border-bottom-width',
	'border-left-width',
	'border-style',
	'padding-top',
	'padding-right',
	'padding-bottom',
	'padding-left',
	'font-style',
	'font-variant',
	'font-weight',
	'font-stretch',
	'font-size',
	'font-size-adjust',
	'line-height',
	'font-family',
	'text-align',
	'text-transform',
	'text-indent',
	'text-decoration',
	'letter-spacing',
	'word-spacing',
	'tab-size',
	'-moz-tab-size',
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
		style.setProperty(prop, computed.getPropertyValue(prop));
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
