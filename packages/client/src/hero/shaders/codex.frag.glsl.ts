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

	// Smoke field — large soft shapes; slow upward drift.
	vec2 sp = vec2(p.x * 1.1, p.y * 0.9 - u_time * 0.025);
	float s = smoke(sp, u_time);

	// A second slower, larger layer for depth.
	vec2 sp2 = vec2(p.x * 0.7 + 3.0, p.y * 0.6 - u_time * 0.018);
	float s2 = smoke(sp2, u_time * 0.6);

	// Vertical mask — strong at the bottom, gone before mid-height.
	float vmask  = smoothstep(1.10, 0.45, uv.y);
	float vmask2 = smoothstep(1.05, 0.35, uv.y) * 0.7;

	// Smoke amount — soft thresholding.
	float plumeA = smoothstep(0.30, 0.85, s)  * vmask;
	float plumeB = smoothstep(0.35, 0.90, s2) * vmask2;

	// Combine, then clamp/curve to keep it gentle.
	float plume = clamp(plumeA + plumeB * 0.6, 0.0, 1.0);
	plume = pow(plume, 1.1) * 0.55;

	// Smoke color: a desaturated, slightly cool gray-sepia.
	vec3 smokeCol = vec3(0.62, 0.58, 0.53);

	// Mix toward the smoke color (soft alpha-over).
	vec3 col = mix(base, smokeCol, plume);

	// Vignette.
	vec2 c = uv - 0.5;
	float vig = smoothstep(1.3, 0.4, length(c * vec2(0.9, 1.2)));
	col *= 0.92 + 0.08 * vig;

	gl_FragColor = vec4(col, 1.0);
}
`;
