import { describe, expect, it } from 'vitest';
import {
	DEFAULT_HERO_PARAMS,
	HERO_CONTROL_GROUPS,
	HERO_UNIFORM_KEYS,
	formatHeroParams,
	hexToVec3,
	isDefaultValue,
	sanitizeHeroParams,
	vec3ToHex,
} from './heroParams.js';
import { CODEX_FRAG } from './shaders/codex.frag.glsl.js';

describe('HeroParams ↔ shader contract', () => {
	it('declares a uniform of the matching GLSL type for every param', () => {
		for (const key of HERO_UNIFORM_KEYS) {
			const value = DEFAULT_HERO_PARAMS[key];
			const glslType = typeof value === 'number' ? 'float' : value.length === 2 ? 'vec2' : 'vec3';
			expect(CODEX_FRAG, `u_${key}`).toMatch(new RegExp(`uniform ${glslType} u_${key};`));
		}
	});

	it('does not upload timeSpeed, which drives the JS clock', () => {
		expect(HERO_UNIFORM_KEYS).not.toContain('timeSpeed');
	});

	it('exposes every param in exactly one tuner control', () => {
		const controlled = HERO_CONTROL_GROUPS.flatMap((g) => g.controls.map((c) => c.key)).sort();
		expect(controlled).toEqual(Object.keys(DEFAULT_HERO_PARAMS).sort());
	});
});

describe('sanitizeHeroParams', () => {
	it('returns the defaults for non-object input', () => {
		expect(sanitizeHeroParams(null)).toEqual(DEFAULT_HERO_PARAMS);
		expect(sanitizeHeroParams([1, 2])).toEqual(DEFAULT_HERO_PARAMS);
		expect(sanitizeHeroParams('x')).toEqual(DEFAULT_HERO_PARAMS);
	});

	it('keeps well-formed values and drops malformed or unknown ones', () => {
		const result = sanitizeHeroParams({
			plumeOpacity: 0.9,
			smokeColor: [0.1, 0.2, 0.3],
			plumeGamma: 'high',
			octaves: Number.NaN,
			maskX: [0.1],
			goldCore: [0.2, null],
			notAParam: 4,
		});
		expect(result.plumeOpacity).toBe(0.9);
		expect(result.smokeColor).toEqual([0.1, 0.2, 0.3]);
		expect(result.plumeGamma).toBe(DEFAULT_HERO_PARAMS.plumeGamma);
		expect(result.octaves).toBe(DEFAULT_HERO_PARAMS.octaves);
		expect(result.maskX).toEqual(DEFAULT_HERO_PARAMS.maskX);
		expect(result.goldCore).toEqual(DEFAULT_HERO_PARAMS.goldCore);
		expect(result).not.toHaveProperty('notAParam');
	});

	it('never hands out the default arrays themselves', () => {
		const result = sanitizeHeroParams(null);
		result.paperTop[0] = 0;
		expect(DEFAULT_HERO_PARAMS.paperTop[0]).not.toBe(0);
	});
});

describe('formatHeroParams', () => {
	it('round-trips through JSON and sanitize', () => {
		const tuned = sanitizeHeroParams({ layerARise: 0.0123, vignetteAspect: [1.5, 0.75] });
		expect(sanitizeHeroParams(JSON.parse(formatHeroParams(tuned)))).toEqual(tuned);
	});
});

describe('isDefaultValue', () => {
	it('compares scalars and vectors against the shipped values', () => {
		expect(isDefaultValue('plumeOpacity', DEFAULT_HERO_PARAMS.plumeOpacity)).toBe(true);
		expect(isDefaultValue('plumeOpacity', 0.5)).toBe(false);
		expect(isDefaultValue('maskX', [...DEFAULT_HERO_PARAMS.maskX])).toBe(true);
		expect(isDefaultValue('maskX', [0.25, 0.5])).toBe(false);
	});
});

describe('color conversion', () => {
	it('converts to hex, clamping out-of-range channels', () => {
		expect(vec3ToHex([1, 0, 0.5])).toBe('#ff0080');
		expect(vec3ToHex([2, -1, 0])).toBe('#ff0000');
	});

	it('parses hex with or without the hash and rejects junk', () => {
		expect(hexToVec3('#ff0000')).toEqual([1, 0, 0]);
		expect(hexToVec3('00FF00')).toEqual([0, 1, 0]);
		expect(hexToVec3('#fff')).toBeNull();
		expect(hexToVec3('nope')).toBeNull();
	});
});
