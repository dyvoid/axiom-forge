import { COMMON_GLSL } from './common.glsl.js';

// Every u_* below except u_res/u_time/u_mouse comes from HeroParams
// (../heroParams.ts), which holds the shipped values and their meaning.
export const CODEX_FRAG = COMMON_GLSL + `
uniform vec3 u_paperBottom;
uniform vec3 u_paperTop;
uniform vec3 u_smokeColor;
uniform vec3 u_goldColor;

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

uniform float u_plumeGamma;
uniform float u_plumeOpacity;

uniform float u_maskMode;
uniform vec2 u_maskX;
uniform vec2 u_maskY;
uniform float u_maskFloor;

uniform float u_goldAmount;
uniform vec2 u_goldCore;

uniform float u_vignetteStrength;
uniform vec2 u_vignetteRadius;
uniform vec2 u_vignetteAspect;

// Domain-warped fbm produces fluid smoke shapes.
float smoke(vec2 p, float t) {
	vec2 q = vec2(fbm(p + vec2(0.0, t * 0.05)),
				fbm(p + vec2(5.2, t * 0.04) + 4.0));
	vec2 r = vec2(fbm(p + u_warpInner * q + vec2(1.7, 9.2) - vec2(0.0, t * 0.07)),
				fbm(p + u_warpInner * q + vec2(8.3, 2.8) - vec2(0.0, t * 0.05)));
	return fbm(p + u_warpOuter * r);
}

void main() {
	vec2 uv = v_uv;
	vec2 p = uv;
	p.x *= u_res.x / u_res.y;

	// Warm parchment base with a low-frequency mottle.
	vec3 base = mix(u_paperBottom, u_paperTop, uv.y);
	float grain = fbm(uv * u_mottleScale + 13.0);
	base *= 1.0 - 0.5 * u_mottleAmount + u_mottleAmount * grain;

	// Smoke field — large soft shapes; upward drift.
	vec2 sp = vec2(p.x * u_layerAScale.x, p.y * u_layerAScale.y - u_time * u_layerARise);
	float s = smoke(sp, u_time * u_layerAFlow);

	// A second slower, larger layer for depth.
	vec2 sp2 = vec2(p.x * u_layerBScale.x + 3.0, p.y * u_layerBScale.y - u_time * u_layerBRise);
	float s2 = smoke(sp2, u_time * u_layerBFlow);

	// Vertical mask — smoke rises from the bottom, fades before the top.
	float vmaskA = smoothstep(u_layerAFade.x, u_layerAFade.y, uv.y);
	float vmaskB = smoothstep(u_layerBFade.x, u_layerBFade.y, uv.y);

	float plumeA = smoothstep(u_layerAThreshold.x, u_layerAThreshold.y, s)  * vmaskA;
	float plumeB = smoothstep(u_layerBThreshold.x, u_layerBThreshold.y, s2) * vmaskB;

	// Combine, then curve for presence while keeping dark cores tight.
	float plume = clamp(plumeA + plumeB * u_layerBAmount, 0.0, 1.0);
	plume = pow(plume, u_plumeGamma) * u_plumeOpacity;

	// Mode 0 (shipped): the product of the two edges is 1 only where the pixel
	// is far from centre on both axes, so it thins the corners and leaves the
	// centre at full strength. Mode 1: a box around the centre instead, which
	// keeps the title area clear.
	float ex = smoothstep(u_maskX.x, u_maskX.y, abs(uv.x - 0.5));
	float ey = smoothstep(u_maskY.x, u_maskY.y, abs(uv.y - 0.5));
	float thin = mix(ex * ey, (1.0 - ex) * (1.0 - ey), u_maskMode);
	plume *= u_maskFloor + (1.0 - u_maskFloor) * (1.0 - thin);

	// Mix toward the smoke color (soft alpha-over).
	vec3 col = mix(base, u_smokeColor, plume);

	// Gold warmth in the densest plume cores.
	float core = smoothstep(u_goldCore.x, u_goldCore.y, plume);
	col = mix(col, u_goldColor, core * u_goldAmount);

	// Vignette.
	vec2 c = uv - 0.5;
	float vig = smoothstep(u_vignetteRadius.x, u_vignetteRadius.y, length(c * u_vignetteAspect));
	col *= 1.0 - u_vignetteStrength + u_vignetteStrength * vig;

	gl_FragColor = vec4(col, 1.0);
}
`;
