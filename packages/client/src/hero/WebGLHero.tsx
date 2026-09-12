import { useEffect, useRef } from 'react';
import { DEFAULT_HERO_PARAMS, HERO_UNIFORM_KEYS, type HeroParams } from './heroParams.js';
import { CODEX_FRAG } from './shaders/codex.frag.glsl.js';
import { HERO_VERT } from './shaders/hero.vert.glsl.js';

type WebGLHeroProps = {
	variant?: 'codex'; // Future: 'lapidary' | 'penumbra'
	className?: string;
	/** Shader tuning; the landing page ships the defaults, `?tune` edits them live. */
	params?: Readonly<HeroParams>;
};

const SHADERS: Record<string, string> = {
	codex: CODEX_FRAG,
};

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
	const sh = gl.createShader(type);
	if (!sh) return null;
	gl.shaderSource(sh, src);
	gl.compileShader(sh);
	if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
		console.error('Shader compile error:', gl.getShaderInfoLog(sh), src);
		gl.deleteShader(sh);
		return null;
	}
	return sh;
}

export function WebGLHero({ variant = 'codex', className, params = DEFAULT_HERO_PARAMS }: WebGLHeroProps): JSX.Element {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	// Params are read through a ref so changing them never rebuilds the GL
	// program; the animation loop picks them up on its next frame.
	const paramsRef = useRef(params);
	// Set only under reduced motion, where there is no loop to pick changes up.
	const redrawRef = useRef<(() => void) | null>(null);

	useEffect(() => {
		paramsRef.current = params;
		redrawRef.current?.();
	}, [params]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const fragSrc = SHADERS[variant];
		if (!fragSrc) {
			console.error('Unknown hero variant:', variant);
			return;
		}

		const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
		if (!gl) {
			console.warn('WebGL unavailable — hero will be blank.');
			return;
		}

		const v = compileShader(gl, gl.VERTEX_SHADER, HERO_VERT);
		const f = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
		if (!v || !f) return;

		const prog = gl.createProgram();
		if (!prog) return;
		gl.attachShader(prog, v);
		gl.attachShader(prog, f);
		gl.linkProgram(prog);
		if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
			console.error('Program link error:', gl.getProgramInfoLog(prog));
			return;
		}
		gl.useProgram(prog);

		const buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buf);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

		const aPos = gl.getAttribLocation(prog, 'a_pos');
		gl.enableVertexAttribArray(aPos);
		gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

		const uRes = gl.getUniformLocation(prog, 'u_res');
		const uTime = gl.getUniformLocation(prog, 'u_time');
		const uMouse = gl.getUniformLocation(prog, 'u_mouse');
		const paramUniforms = HERO_UNIFORM_KEYS.map((key) => [key, gl.getUniformLocation(prog, `u_${key}`)] as const);

		function uploadParams() {
			const p = paramsRef.current;
			for (const [key, loc] of paramUniforms) {
				const value = p[key];
				if (typeof value === 'number') gl?.uniform1f(loc, value);
				else if (value.length === 2) gl?.uniform2fv(loc, value);
				else gl?.uniform3fv(loc, value);
			}
		}

		const mouse = [0.5, 0.5];
		function onMove(e: MouseEvent) {
			if (!canvas) return;
			const r = canvas.getBoundingClientRect();
			mouse[0] = (e.clientX - r.left) / r.width;
			mouse[1] = 1.0 - (e.clientY - r.top) / r.height;
		}
		window.addEventListener('mousemove', onMove);

		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		function resize() {
			if (!canvas) return;
			const w = Math.floor(canvas.clientWidth * dpr);
			const h = Math.floor(canvas.clientHeight * dpr);
			if (canvas.width !== w || canvas.height !== h) {
				canvas.width = w;
				canvas.height = h;
				gl?.viewport(0, 0, w, h);
			}
		}

		// Respect prefers-reduced-motion: render a single static frame
		// instead of an infinite animation loop.
		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		let raf = 0;
		let alive = true;

		// The shader starts mid-flow rather than from a cold, uniform field, and
		// at a different point on every load so the hero is not the same image
		// each visit. `u_time` only translates the noise domain — the smoke is
		// fbm-driven and has no period — so any offset yields a different
		// composition, and the drift rates (0.04-0.07 units/sec) mean a few tens
		// of seconds already moves the field by a whole noise cell.
		//
		// The jitter is bounded rather than arbitrary: those same coordinates
		// grow with time and `fbm` amplifies them by ~2.02^4 before hashing, so
		// a large enough offset pushes the noise into float precision where it
		// bands and repeats. 10 minutes is far more variation than the eye can
		// track between visits while keeping the magnitudes small.
		const PREWARM_SECONDS = 60;
		const PREWARM_JITTER_SECONDS = 600;
		let simSeconds = PREWARM_SECONDS + Math.random() * PREWARM_JITTER_SECONDS;
		let lastNow = performance.now();

		// Time is integrated rather than read off the wall clock so `timeSpeed`
		// can change mid-flight without the field jumping. A step is capped so a
		// tab returning from the background resumes where it left off.
		const MAX_STEP_SECONDS = 0.25;

		function drawFrame() {
			const now = performance.now();
			const step = Math.min((now - lastNow) / 1000, MAX_STEP_SECONDS);
			simSeconds += step * paramsRef.current.timeSpeed;
			lastNow = now;

			resize();
			gl?.uniform2f(uRes, canvas!.width, canvas!.height);
			gl?.uniform1f(uTime, simSeconds);
			gl?.uniform2f(uMouse, mouse[0]!, mouse[1]!);
			uploadParams();
			gl?.drawArrays(gl.TRIANGLES, 0, 3);
		}

		function frame() {
			if (!alive) return;
			drawFrame();
			raf = requestAnimationFrame(frame);
		}

		function onVisibilityChange() {
			if (document.hidden) {
				cancelAnimationFrame(raf);
			} else {
				raf = requestAnimationFrame(frame);
			}
		}

		if (reduceMotion) {
			// Single static draw — no rAF loop, no mouse listener.
			drawFrame();
			redrawRef.current = drawFrame;
		} else {
			frame();
			document.addEventListener('visibilitychange', onVisibilityChange);

			return () => {
				alive = false;
				cancelAnimationFrame(raf);
				window.removeEventListener('mousemove', onMove);
				document.removeEventListener('visibilitychange', onVisibilityChange);
			};
		}

		return () => {
			alive = false;
			redrawRef.current = null;
			cancelAnimationFrame(raf);
			window.removeEventListener('mousemove', onMove);
		};
	}, [variant]);

	return (
		<canvas
			ref={canvasRef}
			className={className}
			style={{
				position: 'absolute',
				inset: 0,
				width: '100%',
				height: '100%',
				zIndex: -1,
			}}
		/>
	);
}
