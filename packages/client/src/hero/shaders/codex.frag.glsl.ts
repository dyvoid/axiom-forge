import { COMMON_GLSL } from './common.glsl.js';

// Every u_* below except u_res/u_time/u_mouse comes from HeroParams
// (../heroParams.ts), which holds the shipped values and their meaning.
export const CODEX_FRAG = COMMON_GLSL + `
uniform vec3 u_smokeBottom;
uniform vec3 u_smokeTop;
uniform vec3 u_backgroundColor;
uniform vec3 u_goldColor;
uniform vec3 u_vignetteColor;

uniform float u_mottleAmount;
uniform vec2 u_mottleScale;

uniform float u_warpInner;
uniform float u_warpOuter;

uniform vec2 u_layerAScale;
uniform float u_layerARise;
uniform float u_layerAFlow;
uniform vec2 u_layerAThreshold;
uniform vec2 u_layerAFade;

uniform vec2 u_layerBScale;
uniform float u_layerBRise;
uniform float u_layerBFlow;
uniform vec2 u_layerBThreshold;
uniform vec2 u_layerBFade;
uniform float u_layerBAmount;

uniform float u_smokeMinimum;
uniform float u_gapContrast;

uniform float u_maskMode;
uniform vec2 u_maskX;
uniform vec2 u_maskY;
uniform float u_maskStrength;

uniform float u_goldAmount;
uniform vec2 u_goldRange;

uniform float u_vignetteStrength;
uniform vec2 u_vignetteRadius;
uniform vec2 u_vignetteAspect;

// Domain-warped fbm produces fluid, curling shapes.
float flow(vec2 p, float t) {
	vec2 q = vec2(fbm(p + vec2(0.0, t * 0.05)),
				fbm(p + vec2(5.2, t * 0.04) + 4.0));
	vec2 r = vec2(fbm(p + u_warpInner * q + vec2(1.7, 9.2) - vec2(0.0, t * 0.07)),
				fbm(p + u_warpInner * q + vec2(8.3, 2.8) - vec2(0.0, t * 0.05)));
	return fbm(p + u_warpOuter * r);
}

// The picture is a pale smoke body with gaps in it. Two drifting noise
// layers open the gaps; the darker background shows through them.
void main() {
	vec2 uv = v_uv;
	vec2 p = uv;
	p.x *= u_res.x / u_res.y;

	// Smoke body: a soft vertical gradient with a low-frequency mottle.
	vec3 smokeCol = mix(u_smokeBottom, u_smokeTop, uv.y);
	float grain = fbm(uv * u_mottleScale + 13.0);
	smokeCol *= 1.0 - 0.5 * u_mottleAmount + u_mottleAmount * grain;

	// Near layer — large soft shapes; upward drift.
	vec2 sp = vec2(p.x * u_layerAScale.x, p.y * u_layerAScale.y - u_time * u_layerARise);
	float nA = flow(sp, u_time * u_layerAFlow);

	// Far layer — slower and larger, for depth.
	vec2 sp2 = vec2(p.x * u_layerBScale.x + 3.0, p.y * u_layerBScale.y - u_time * u_layerBRise);
	float nB = flow(sp2, u_time * u_layerBFlow);

	// Gaps open lower down and close toward the top.
	float heightA = smoothstep(u_layerAFade.x, u_layerAFade.y, uv.y);
	float heightB = smoothstep(u_layerBFade.x, u_layerBFade.y, uv.y);

	float gapA = smoothstep(u_layerAThreshold.x, u_layerAThreshold.y, nA) * heightA;
	float gapB = smoothstep(u_layerBThreshold.x, u_layerBThreshold.y, nB) * heightB;

	// Combine, curve so open gaps stay tight, and cap how far a gap can open.
	float gap = clamp(gapA + gapB * u_layerBAmount, 0.0, 1.0);
	gap = pow(gap, u_gapContrast) * (1.0 - u_smokeMinimum);

	// Mode 0 (shipped): the product of the two edges is 1 only where the pixel
	// is far from centre on both axes, so the corners fill in and the centre
	// keeps its gaps. Mode 1: a box around the centre fills in instead.
	float ex = smoothstep(u_maskX.x, u_maskX.y, abs(uv.x - 0.5));
	float ey = smoothstep(u_maskY.x, u_maskY.y, abs(uv.y - 0.5));
	float masked = mix(ex * ey, (1.0 - ex) * (1.0 - ey), u_maskMode);
	gap *= 1.0 - u_maskStrength * masked;

	float smoke = 1.0 - gap;
	vec3 col = mix(u_backgroundColor, smokeCol, smoke);

	// Gold warmth where the smoke is thinnest.
	float gold = smoothstep(u_goldRange.x, u_goldRange.y, smoke);
	col = mix(col, u_goldColor, gold * u_goldAmount);

	// Vignette: tints the edges toward its color. With black this is the same
	// as darkening by (1 - strength) at the rim.
	vec2 c = uv - 0.5;
	float vig = smoothstep(u_vignetteRadius.x, u_vignetteRadius.y, length(c * u_vignetteAspect));
	col = mix(col, u_vignetteColor, u_vignetteStrength * (1.0 - vig));

	gl_FragColor = vec4(col, 1.0);
}
`;
