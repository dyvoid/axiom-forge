import { describe, expect, it } from 'vitest';
import type { HeroTheme } from '@axiom-forge/shared';
import { DEFAULT_HERO_PARAMS, hexToVec3, sanitizeHeroParams } from './heroParams.js';
import { heroThemeFromParams, resolveHeroParams } from './heroTheme.js';

describe('resolveHeroParams', () => {
	it('returns the app defaults when the project sets nothing', () => {
		expect(resolveHeroParams(undefined)).toEqual(DEFAULT_HERO_PARAMS);
		expect(resolveHeroParams({})).toEqual(DEFAULT_HERO_PARAMS);
		expect(resolveHeroParams({ enabled: false })).toEqual(DEFAULT_HERO_PARAMS);
	});

	it('maps each theme setting onto its params', () => {
		const p = resolveHeroParams({
			background: '#102030',
			gold: '#ff0000',
			density: 0.9,
			speed: 0,
			clearTitle: true,
			vignette: { color: '#00ff00', strength: 0.5 },
		});
		expect(p.backgroundColor).toEqual(hexToVec3('#102030'));
		expect(p.goldColor).toEqual([1, 0, 0]);
		expect(p.smokeMinimum).toBe(0.9);
		expect(p.timeSpeed).toBe(0);
		expect(p.maskMode).toBe(1);
		expect(p.vignetteColor).toEqual([0, 1, 0]);
		expect(p.vignetteStrength).toBe(0.5);
	});

	it('sets the smoke gradient from one color, keeping the top darker than the bottom', () => {
		const p = resolveHeroParams({ smoke: '#ffffff' });
		expect(p.smokeBottom).toEqual([1, 1, 1]);
		p.smokeTop.forEach((c, i) => expect(c).toBeLessThan(p.smokeBottom[i]!));
	});

	it('makes shapes larger as size grows by dividing both layer scales', () => {
		const p = resolveHeroParams({ size: 2 });
		expect(p.layerAScale).toEqual([DEFAULT_HERO_PARAMS.layerAScale[0] / 2, DEFAULT_HERO_PARAMS.layerAScale[1] / 2]);
		expect(p.layerBScale).toEqual([DEFAULT_HERO_PARAMS.layerBScale[0] / 2, DEFAULT_HERO_PARAMS.layerBScale[1] / 2]);
	});
});

describe('heroThemeFromParams', () => {
	it('exports nothing for the app defaults', () => {
		expect(heroThemeFromParams(DEFAULT_HERO_PARAMS)).toEqual({ theme: {}, unsupported: [] });
	});

	it('round-trips a theme through resolveHeroParams', () => {
		const hero: HeroTheme = {
			smoke: '#e0d0c0',
			background: '#302010',
			gold: '#aa8844',
			density: 0.25,
			speed: 2.5,
			size: 1.75,
			clearTitle: true,
			vignette: { color: '#112233', strength: 0.3 },
		};
		expect(heroThemeFromParams(resolveHeroParams(hero))).toEqual({ theme: { hero }, unsupported: [] });
	});

	it('includes enabled only when the hero is switched off', () => {
		expect(heroThemeFromParams(DEFAULT_HERO_PARAMS, false).theme).toEqual({ hero: { enabled: false } });
	});

	it('lists tuned values theme.json cannot express', () => {
		const tuned = sanitizeHeroParams({
			octaves: 3,
			layerAScale: [2, 2],
			smokeTop: [0.1, 0.1, 0.1],
			maskMode: 0.5,
		});
		expect(heroThemeFromParams(tuned).unsupported.sort()).toEqual(
			['layerAScale', 'layerBScale', 'maskMode', 'octaves', 'smokeTop'].sort(),
		);
	});
});
