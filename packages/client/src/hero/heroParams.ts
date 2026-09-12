/**
 * Tunable values for the landing hero's codex shader.
 *
 * Every key except `timeSpeed` is uploaded as a `u_<key>` uniform each frame,
 * so this object and the shader source must name the same things —
 * `heroParams.test.ts` holds the two together. `DEFAULT_HERO_PARAMS` is the
 * look the landing page ships with; the `?tune` panel edits a copy of it.
 *
 * The picture is a pale smoke body with gaps in it: two drifting noise layers
 * open the gaps, and the darker background shows through them. The smoke is
 * the lightest color, so the controls below all describe the smoke and its
 * gaps rather than a dark plume painted over paper.
 *
 * Colors are 0–1 RGB triples written straight to the framebuffer, not hex, so
 * the defaults stay exact rather than quantised to 1/255.
 */

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

export type HeroParams = {
	timeSpeed: number;

	smokeBottom: Vec3;
	smokeTop: Vec3;
	backgroundColor: Vec3;
	goldColor: Vec3;
	vignetteColor: Vec3;

	mottleAmount: number;
	mottleScale: Vec2;

	octaves: number;
	warpInner: number;
	warpOuter: number;

	layerAScale: Vec2;
	layerARise: number;
	layerAFlow: number;
	layerAThreshold: Vec2;
	layerAFade: Vec2;

	layerBScale: Vec2;
	layerBRise: number;
	layerBFlow: number;
	layerBThreshold: Vec2;
	layerBFade: Vec2;
	layerBAmount: number;

	smokeMinimum: number;
	gapContrast: number;

	maskMode: number;
	maskX: Vec2;
	maskY: Vec2;
	maskStrength: number;

	goldAmount: number;
	goldRange: Vec2;

	vignetteStrength: number;
	vignetteRadius: Vec2;
	vignetteAspect: Vec2;
};

export const DEFAULT_HERO_PARAMS: Readonly<HeroParams> = {
	timeSpeed: 1,

	smokeBottom: [0.965, 0.945, 0.905],
	smokeTop: [0.935, 0.905, 0.85],
	backgroundColor: [0.6, 0.54, 0.45],
	goldColor: [0.6, 0.48, 0.28],
	vignetteColor: [0, 0, 0],

	mottleAmount: 0.06,
	mottleScale: [6.4, 3.6],

	octaves: 5,
	warpInner: 1.4,
	warpOuter: 1.2,

	layerAScale: [1.1, 0.9],
	layerARise: 0.04,
	layerAFlow: 1,
	layerAThreshold: [0.26, 0.78],
	layerAFade: [1.1, 0.35],

	layerBScale: [0.7, 0.6],
	layerBRise: 0.028,
	layerBFlow: 0.6,
	layerBThreshold: [0.3, 0.84],
	layerBFade: [1.05, 0.25],
	layerBAmount: 0.44,

	smokeMinimum: 0.38,
	gapContrast: 1.35,

	maskMode: 0,
	maskX: [0.25, 0.45],
	maskY: [0.18, 0.32],
	maskStrength: 0.65,

	goldAmount: 0.15,
	goldRange: [0.45, 0.05],

	vignetteStrength: 0.08,
	vignetteRadius: [1.3, 0.4],
	vignetteAspect: [0.9, 1.2],
};

type KeysOfType<T> = { [K in keyof HeroParams]: HeroParams[K] extends T ? K : never }[keyof HeroParams];

export type HeroParamKey = keyof HeroParams;

/** Keys the renderer uploads as `u_<key>` uniforms. */
export const HERO_UNIFORM_KEYS = (Object.keys(DEFAULT_HERO_PARAMS) as HeroParamKey[]).filter(
	(key) => key !== 'timeSpeed',
);

export type HeroControl =
	| { kind: 'range'; key: KeysOfType<number>; label: string; min: number; max: number; step: number; hint?: string }
	| {
			kind: 'range2';
			key: KeysOfType<Vec2>;
			label: string;
			parts: [string, string];
			min: number;
			max: number;
			step: number;
			hint?: string;
	  }
	| { kind: 'color'; key: KeysOfType<Vec3>; label: string }
	| {
			kind: 'choice';
			key: KeysOfType<number>;
			label: string;
			options: { value: number; label: string }[];
			hint?: string;
	  };

export type HeroControlGroup = { title: string; controls: HeroControl[] };

function gapLayerControls(
	layer: 'A' | 'B',
): HeroControl[] {
	return [
		{ kind: 'range2', key: `layer${layer}Scale`, label: 'Scale', parts: ['X', 'Y'], min: 0.05, max: 5, step: 0.01 },
		{ kind: 'range', key: `layer${layer}Rise`, label: 'Rise speed', min: -0.2, max: 0.3, step: 0.001 },
		{ kind: 'range', key: `layer${layer}Flow`, label: 'Churn speed', min: 0, max: 5, step: 0.05 },
		{
			kind: 'range2',
			key: `layer${layer}Threshold`,
			label: 'Gap threshold',
			parts: ['Opens at', 'Fully open'],
			min: 0,
			max: 1,
			step: 0.01,
			hint: 'Noise value where this layer starts opening a gap, and where the gap is fully open',
		},
		{
			kind: 'range2',
			key: `layer${layer}Fade`,
			label: 'Gaps by height',
			parts: ['None above', 'Full below'],
			min: -0.5,
			max: 1.5,
			step: 0.01,
			hint: '0 is the bottom edge, 1 the top',
		},
	];
}

export const HERO_CONTROL_GROUPS: HeroControlGroup[] = [
	{
		title: 'Time',
		controls: [
			{ kind: 'range', key: 'timeSpeed', label: 'Speed', min: 0, max: 10, step: 0.05, hint: '0 pauses the field' },
		],
	},
	{
		title: 'Colors',
		controls: [
			{ kind: 'color', key: 'smokeBottom', label: 'Smoke, bottom' },
			{ kind: 'color', key: 'smokeTop', label: 'Smoke, top' },
			{ kind: 'color', key: 'backgroundColor', label: 'Background' },
			{ kind: 'color', key: 'goldColor', label: 'Gold' },
			{ kind: 'color', key: 'vignetteColor', label: 'Vignette' },
		],
	},
	{
		title: 'Smoke',
		controls: [
			{
				kind: 'range',
				key: 'smokeMinimum',
				label: 'Minimum density',
				min: 0,
				max: 1,
				step: 0.01,
				hint: 'The smoke never gets thinner than this, even in a fully open gap',
			},
			{ kind: 'range', key: 'gapContrast', label: 'Gap contrast (gamma)', min: 0.2, max: 4, step: 0.01 },
		],
	},
	{
		title: 'Smoke texture',
		controls: [
			{ kind: 'range', key: 'mottleAmount', label: 'Amount', min: 0, max: 0.4, step: 0.005 },
			{ kind: 'range2', key: 'mottleScale', label: 'Scale', parts: ['X', 'Y'], min: 0, max: 60, step: 0.1 },
		],
	},
	{
		title: 'Noise',
		controls: [
			{ kind: 'range', key: 'octaves', label: 'Octaves', min: 1, max: 8, step: 1, hint: 'Detail; also affects the smoke texture' },
			{ kind: 'range', key: 'warpInner', label: 'Warp, inner', min: 0, max: 5, step: 0.05 },
			{ kind: 'range', key: 'warpOuter', label: 'Warp, outer', min: 0, max: 5, step: 0.05 },
		],
	},
	{ title: 'Gaps · near layer', controls: gapLayerControls('A') },
	{
		title: 'Gaps · far layer',
		controls: [
			{ kind: 'range', key: 'layerBAmount', label: 'Strength', min: 0, max: 1.5, step: 0.01 },
			...gapLayerControls('B'),
		],
	},
	{
		title: 'Mask',
		controls: [
			{
				kind: 'choice',
				key: 'maskMode',
				label: 'Fills the gaps in',
				options: [
					{ value: 0, label: 'Corners (shipped)' },
					{ value: 1, label: 'Centre box' },
				],
			},
			{ kind: 'range2', key: 'maskX', label: 'Horizontal edge', parts: ['From', 'To'], min: 0, max: 0.7, step: 0.01, hint: 'Distance from centre' },
			{ kind: 'range2', key: 'maskY', label: 'Vertical edge', parts: ['From', 'To'], min: 0, max: 0.7, step: 0.01 },
			{ kind: 'range', key: 'maskStrength', label: 'Strength', min: 0, max: 1, step: 0.01, hint: '1 fills the gaps completely' },
		],
	},
	{
		title: 'Gold (in the gaps)',
		controls: [
			{ kind: 'range', key: 'goldAmount', label: 'Amount', min: 0, max: 1, step: 0.01 },
			{
				kind: 'range2',
				key: 'goldRange',
				label: 'Smoke density',
				parts: ['Starts below', 'Full at'],
				min: 0,
				max: 1,
				step: 0.01,
				hint: 'Gold appears where the smoke is thinner than the first value',
			},
		],
	},
	{
		title: 'Vignette',
		controls: [
			{ kind: 'range', key: 'vignetteStrength', label: 'Strength', min: 0, max: 0.6, step: 0.005 },
			{ kind: 'range2', key: 'vignetteRadius', label: 'Radius', parts: ['Outer', 'Inner'], min: 0, max: 2, step: 0.01 },
			{ kind: 'range2', key: 'vignetteAspect', label: 'Aspect', parts: ['X', 'Y'], min: 0.2, max: 3, step: 0.01 },
		],
	},
];

function cloneParams(params: Readonly<HeroParams>): HeroParams {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(params)) {
		out[key] = Array.isArray(value) ? [...value] : value;
	}
	return out as HeroParams;
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Builds a full `HeroParams` from untrusted input (localStorage, a pasted
 * blob). Known keys with the right shape are kept; anything missing, unknown,
 * or malformed falls back to the default, so an older saved blob still loads
 * after a key is added.
 */
export function sanitizeHeroParams(input: unknown): HeroParams {
	const out = cloneParams(DEFAULT_HERO_PARAMS) as unknown as Record<string, unknown>;
	if (typeof input !== 'object' || input === null || Array.isArray(input)) return out as unknown as HeroParams;
	const source = input as Record<string, unknown>;

	for (const [key, fallback] of Object.entries(DEFAULT_HERO_PARAMS)) {
		const value = source[key];
		if (Array.isArray(fallback)) {
			if (Array.isArray(value) && value.length === fallback.length && value.every(isFiniteNumber)) {
				out[key] = [...value];
			}
		} else if (isFiniteNumber(value)) {
			out[key] = value;
		}
	}
	return out as unknown as HeroParams;
}

const round = (n: number): number => Math.round(n * 10000) / 10000;

/** One key per line, valid JSON — pastes straight into `DEFAULT_HERO_PARAMS`. */
export function formatHeroParams(params: Readonly<HeroParams>): string {
	const lines = Object.entries(params).map(([key, value]) => {
		const rounded = Array.isArray(value) ? value.map(round) : round(value as number);
		return `\t"${key}": ${JSON.stringify(rounded).replace(/,/g, ', ')}`;
	});
	return `{\n${lines.join(',\n')}\n}`;
}

export function isDefaultValue(key: HeroParamKey, value: number | Vec2 | Vec3): boolean {
	const fallback = DEFAULT_HERO_PARAMS[key];
	if (Array.isArray(fallback) && Array.isArray(value)) {
		return fallback.every((n, i) => round(n) === round(value[i] ?? NaN));
	}
	return round(fallback as number) === round(value as number);
}

export function vec3ToHex(color: Readonly<Vec3>): string {
	return (
		'#' +
		color
			.map((c) =>
				Math.round(Math.min(1, Math.max(0, c)) * 255)
					.toString(16)
					.padStart(2, '0'),
			)
			.join('')
	);
}

export function hexToVec3(hex: string): Vec3 | null {
	const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
	if (!match) return null;
	return [
		round(parseInt(match[1]!, 16) / 255),
		round(parseInt(match[2]!, 16) / 255),
		round(parseInt(match[3]!, 16) / 255),
	];
}
