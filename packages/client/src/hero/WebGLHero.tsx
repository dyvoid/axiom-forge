import { useEffect, useRef } from 'react';
import { CODEX_FRAG } from './shaders/codex.frag.glsl.js';
import { HERO_VERT } from './shaders/hero.vert.glsl.js';

type WebGLHeroProps = {
	variant?: 'codex'; // Future: 'lapidary' | 'penumbra'
	className?: string;
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

export function WebGLHero({ variant = 'codex', className }: WebGLHeroProps): JSX.Element {
	const canvasRef = useRef<HTMLCanvasElement>(null);

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

		let raf = 0;
		let alive = true;
		const prewarmSeconds = 60;
		const start = performance.now() - prewarmSeconds * 1000;

		function frame() {
			if (!alive) return;
			resize();
			gl?.uniform2f(uRes, canvas!.width, canvas!.height);
			gl?.uniform1f(uTime, (performance.now() - start) / 1000);
			gl?.uniform2f(uMouse, mouse[0]!, mouse[1]!);
			gl?.drawArrays(gl.TRIANGLES, 0, 3);
			raf = requestAnimationFrame(frame);
		}
		frame();

		function onVisibilityChange() {
			if (document.hidden) {
				cancelAnimationFrame(raf);
			} else {
				raf = requestAnimationFrame(frame);
			}
		}
		document.addEventListener('visibilitychange', onVisibilityChange);

		return () => {
			alive = false;
			cancelAnimationFrame(raf);
			window.removeEventListener('mousemove', onMove);
			document.removeEventListener('visibilitychange', onVisibilityChange);
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
