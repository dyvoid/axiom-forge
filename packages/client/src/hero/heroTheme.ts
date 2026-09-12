/**
 * The bridge between a project's theme.json `hero` section (ADR-0001) and the
 * shader's `HeroParams`.
 *
 * theme.json speaks a small, look-level vocabulary so projects stay stable
 * while the shader changes; `resolveHeroParams` is the one place those
 * choices meet the app defaults. `heroThemeFromParams` runs the other way, so
 * the `?tune` panel can hand out a theme.json for what is on screen.
 */

import type { HeroTheme, Theme } from '@axiom-forge/shared';
import {
	DEFAULT_HERO_PARAMS,
	hexToVec3,
	isDefaultValue,
	sanitizeHeroParams,
	vec3ToHex,
	type HeroParamKey,
	type HeroParams,
	type Vec2,
	type Vec3,
} from './heroParams.js';

const round = (n: number): number => Math.round(n * 10000) / 10000;

// theme.json sets one smoke color; the top of the gradient keeps the shipped
// defaults' per-channel ratio to the bottom.
const SMOKE_TOP_RATIO = DEFAULT_HERO_PARAMS.smokeTop.map(
	(c, i) => c / DEFAULT_HERO_PARAMS.smokeBottom[i]!,
) as Vec3;

function smokeTopFor(bottom: Readonly<Vec3>): Vec3 {
	return bottom.map((c, i) => round(c * SMOKE_TOP_RATIO[i]!)) as Vec3;
}

function scaleFor(defaultScale: Readonly<Vec2>, size: number): Vec2 {
	return [defaultScale[0] / size, defaultScale[1] / size];
}

/** Apply a project's hero theme to the app defaults. `enabled` is the caller's concern. */
export function resolveHeroParams(hero: HeroTheme | undefined): HeroParams {
	const params = sanitizeHeroParams(null);
	if (!hero) return params;

	const smoke = hero.smoke ? hexToVec3(hero.smoke) : null;
	if (smoke) {
		params.smokeBottom = smoke;
		params.smokeTop = smokeTopFor(smoke);
	}
	const background = hero.background ? hexToVec3(hero.background) : null;
	if (background) params.backgroundColor = background;
	const gold = hero.gold ? hexToVec3(hero.gold) : null;
	if (gold) params.goldColor = gold;
	const vignetteColor = hero.vignette?.color ? hexToVec3(hero.vignette.color) : null;
	if (vignetteColor) params.vignetteColor = vignetteColor;

	if (hero.vignette?.strength !== undefined) params.vignetteStrength = hero.vignette.strength;
	if (hero.density !== undefined) params.smokeMinimum = hero.density;
	if (hero.speed !== undefined) params.timeSpeed = hero.speed;
	if (hero.size !== undefined) {
		params.layerAScale = scaleFor(DEFAULT_HERO_PARAMS.layerAScale, hero.size);
		params.layerBScale = scaleFor(DEFAULT_HERO_PARAMS.layerBScale, hero.size);
	}
	if (hero.clearTitle !== undefined) params.maskMode = hero.clearTitle ? 1 : 0;

	return params;
}

/** Params that theme.json can express, fully or through a derived value. */
const THEMEABLE = new Set<HeroParamKey>([
	'smokeBottom',
	'smokeTop',
	'backgroundColor',
	'goldColor',
	'vignetteColor',
	'vignetteStrength',
	'smokeMinimum',
	'timeSpeed',
	'layerAScale',
	'layerBScale',
	'maskMode',
]);

const near = (a: number, b: number): boolean => Math.abs(a - b) < 5e-4;

export interface HeroThemeExport {
	/** Only the settings that differ from the app defaults. */
	theme: Theme;
	/** Params that differ from the defaults in a way theme.json cannot express. */
	unsupported: HeroParamKey[];
}

/** The theme.json that reproduces `params` as closely as its vocabulary allows. */
export function heroThemeFromParams(params: Readonly<HeroParams>, enabled = true): HeroThemeExport {
	const hero: HeroTheme = {};
	const unsupported: HeroParamKey[] = [];

	if (!enabled) hero.enabled = false;

	const changedHex = (key: 'smokeBottom' | 'backgroundColor' | 'goldColor' | 'vignetteColor') => {
		const hex = vec3ToHex(params[key]);
		return hex === vec3ToHex(DEFAULT_HERO_PARAMS[key]) ? undefined : hex;
	};

	const smoke = changedHex('smokeBottom');
	if (smoke) hero.smoke = smoke;
	if (!smokeTopFor(params.smokeBottom).every((c, i) => near(c, params.smokeTop[i]!))) {
		unsupported.push('smokeTop');
	}

	const background = changedHex('backgroundColor');
	if (background) hero.background = background;
	const gold = changedHex('goldColor');
	if (gold) hero.gold = gold;

	if (!near(params.smokeMinimum, DEFAULT_HERO_PARAMS.smokeMinimum)) hero.density = round(params.smokeMinimum);
	if (!near(params.timeSpeed, DEFAULT_HERO_PARAMS.timeSpeed)) hero.speed = round(params.timeSpeed);

	// `size` scales both layers on both axes by one factor; anything else is
	// a shape theme.json cannot describe.
	const ratios = [
		DEFAULT_HERO_PARAMS.layerAScale[0] / params.layerAScale[0],
		DEFAULT_HERO_PARAMS.layerAScale[1] / params.layerAScale[1],
		DEFAULT_HERO_PARAMS.layerBScale[0] / params.layerBScale[0],
		DEFAULT_HERO_PARAMS.layerBScale[1] / params.layerBScale[1],
	];
	const size = ratios[0]!;
	if (Number.isFinite(size) && size > 0 && ratios.every((r) => Math.abs(r - size) <= 1e-3 * size)) {
		if (!near(size, 1)) hero.size = round(size);
	} else {
		unsupported.push('layerAScale', 'layerBScale');
	}

	if (params.maskMode !== DEFAULT_HERO_PARAMS.maskMode) {
		if (params.maskMode === 0 || params.maskMode === 1) hero.clearTitle = params.maskMode === 1;
		else unsupported.push('maskMode');
	}

	const vignetteColor = changedHex('vignetteColor');
	const vignetteStrength = near(params.vignetteStrength, DEFAULT_HERO_PARAMS.vignetteStrength)
		? undefined
		: round(params.vignetteStrength);
	if (vignetteColor || vignetteStrength !== undefined) {
		hero.vignette = {
			...(vignetteColor ? { color: vignetteColor } : {}),
			...(vignetteStrength !== undefined ? { strength: vignetteStrength } : {}),
		};
	}

	for (const key of Object.keys(DEFAULT_HERO_PARAMS) as HeroParamKey[]) {
		if (!THEMEABLE.has(key) && !isDefaultValue(key, params[key])) unsupported.push(key);
	}

	return { theme: Object.keys(hero).length > 0 ? { hero } : {}, unsupported };
}
