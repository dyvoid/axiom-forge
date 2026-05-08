/**
 * Convert a positive integer to an upper-case Roman numeral string.
 * Returns '' for values ≤ 0.
 */
export function toRoman(n: number): string {
	if (n <= 0) return '';
	const lookup: [number, string][] = [
		[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
		[100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
		[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
	];
	let result = '';
	let remainder = Math.floor(n);
	for (const [value, numeral] of lookup) {
		while (remainder >= value) {
			result += numeral;
			remainder -= value;
		}
	}
	return result;
}
