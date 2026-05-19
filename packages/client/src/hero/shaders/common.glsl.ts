export const COMMON_GLSL = `
precision highp float;
varying vec2 v_uv;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;

float hash(vec2 p) {
	vec2 q = fract(p * vec2(0.1031, 0.1030));
	q += dot(q, q.yx + 33.33);
	return fract((q.x + q.y) * q.x);
}

float vnoise(vec2 p) {
	vec2 i = floor(p), f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(
		mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
		mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
	float v = 0.0, a = 0.5;
	mat2 R = mat2(0.8, -0.6, 0.6, 0.8);
	for (int i = 0; i < 5; i++) {
		v += a * vnoise(p);
		p = R * p * 2.02;
		a *= 0.5;
	}
	return v;
}
`;
