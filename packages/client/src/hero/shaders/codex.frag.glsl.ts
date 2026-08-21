import { COMMON_GLSL } from './common.glsl.js';

export const CODEX_FRAG = COMMON_GLSL + `
// Domain-warped fbm produces fluid smoke shapes.
float smoke(vec2 p, float t) {
	vec2 q = vec2(fbm(p + vec2(0.0, t * 0.05)),
				fbm(p + vec2(5.2, t * 0.04) + 4.0));
	vec2 r = vec2(fbm(p + 1.4 * q + vec2(1.7, 9.2) - vec2(0.0, t * 0.07)),
				fbm(p + 1.4 * q + vec2(8.3, 2.8) - vec2(0.0, t * 0.05)));
	return fbm(p + 1.2 * r);
}

void main() {
	vec2 uv = v_uv;
	vec2 p = uv;
	p.x *= u_res.x / u_res.y;

	// Warm parchment base.
	vec3 base = mix(vec3(0.965, 0.945, 0.905), vec3(0.935, 0.905, 0.85), uv.y);
	float grain = fbm(uv * vec2(1600.0, 900.0) * 0.004 + 13.0);
	base *= 0.97 + 0.06 * grain;

	// Smoke field — large soft shapes; upward drift.
	vec2 sp = vec2(p.x * 1.1, p.y * 0.9 - u_time * 0.04);
	float s = smoke(sp, u_time);

	// A second slower, larger layer for depth.
	vec2 sp2 = vec2(p.x * 0.7 + 3.0, p.y * 0.6 - u_time * 0.028);
	float s2 = smoke(sp2, u_time * 0.6);

	// Vertical mask — smoke rises from the bottom, fades before the top.
	float vmask  = smoothstep(1.10, 0.35, uv.y);
	float vmask2 = smoothstep(1.05, 0.25, uv.y) * 0.8;

	// Smoke amount — visible plumes, but the center of the canvas stays clearer
	// for the title and CTA to remain legible.
	float plumeA = smoothstep(0.26, 0.78, s)  * vmask;
	float plumeB = smoothstep(0.30, 0.84, s2) * vmask2;

	// Combine, then curve for presence while keeping dark cores tight.
	float plume = clamp(plumeA + plumeB * 0.55, 0.0, 1.0);
	plume = pow(plume, 1.35) * 0.62;

	// Center safe-zone: the title and CTA live around (0.5, 0.5).
	float centerMask = smoothstep(0.25, 0.45, abs(uv.x - 0.5))
	                 * smoothstep(0.18, 0.32, abs(uv.y - 0.5));
	plume *= 0.35 + 0.65 * (1.0 - centerMask);

	// Smoke color: warm sepia, lighter than ink so it doesn't fight the type.
	vec3 smokeCol = vec3(0.60, 0.54, 0.45);

	// Mix toward the smoke color (soft alpha-over).
	vec3 col = mix(base, smokeCol, plume);

	// Subtle gold warmth in the brightest plume cores.
	float core = smoothstep(0.55, 0.95, plume);
	vec3 gold = vec3(0.60, 0.48, 0.28);
	col = mix(col, gold, core * 0.15);

	// Vignette.
	vec2 c = uv - 0.5;
	float vig = smoothstep(1.3, 0.4, length(c * vec2(0.9, 1.2)));
	col *= 0.92 + 0.08 * vig;

	gl_FragColor = vec4(col, 1.0);
}
`;
