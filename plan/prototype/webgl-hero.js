// webgl-hero.js — three fragment-shader heroes for Axiom Forge directions.
//   initHero(canvas, kind) — kind ∈ "codex" | "lapidary" | "penumbra"
// Mounts a WebGL context, runs an animation loop, and returns a teardown fn.

(function () {
  const VERT = `
    attribute vec2 a_pos;
    varying vec2 v_uv;
    void main() {
      v_uv = a_pos * 0.5 + 0.5;
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

  // Shared GLSL helpers prepended to each shader.
  const COMMON = `
    precision highp float;
    varying vec2 v_uv;
    uniform vec2 u_res;
    uniform float u_time;
    uniform vec2 u_mouse;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
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

  // ----------------------------------------------------------------------
  // CODEX — soft gray smoke drifting up over warm parchment (Skyrim-style)
  // ----------------------------------------------------------------------
  const FRAG_CODEX = COMMON + `
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
      float grain = fbm(uv * vec2(u_res.x, u_res.y) * 0.004 + 13.0);
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

      // Smoke amount — soft thresholding (no fire-like spikes).
      // Wider lerp range = softer, foggier plumes.
      float plumeA = smoothstep(0.30, 0.85, s)  * vmask;
      float plumeB = smoothstep(0.35, 0.90, s2) * vmask2;

      // Combine, then clamp/curve to keep it gentle.
      float plume = clamp(plumeA + plumeB * 0.6, 0.0, 1.0);
      plume = pow(plume, 1.1) * 0.55;

      // Smoke color: a desaturated, slightly cool gray-sepia.
      // We DARKEN the parchment toward this — no additive glow.
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

  // ----------------------------------------------------------------------
  // LAPIDARY — limestone surface with raking light + emerging glyph traces
  // ----------------------------------------------------------------------
  const FRAG_LAPIDARY = COMMON + `
    // Pseudo-Linear-A glyph: noisy line strokes carved into the stone.
    float carved(vec2 p, float t) {
      // Several thin horizontal/vertical stroke fields.
      float v = 0.0;
      for (int k = 0; k < 4; k++) {
        float fk = float(k);
        vec2 q = p * (3.0 + fk * 1.3) + vec2(fk * 17.0, fk * 9.0);
        // Strokes appear where fbm crosses a threshold band.
        float n = fbm(q + vec2(t * 0.04, 0.0));
        v += smoothstep(0.49, 0.51, n) * (1.0 - smoothstep(0.52, 0.55, n)) * 0.6;
      }
      return v;
    }

    void main() {
      vec2 uv = v_uv;
      vec2 p = uv;
      p.x *= u_res.x / u_res.y;

      // Stone base — warm beige with cool shadow.
      vec3 light = vec3(0.93, 0.90, 0.84);
      vec3 dark  = vec3(0.55, 0.50, 0.44);

      // Multi-octave stone texture.
      float n1 = fbm(p * 3.0);
      float n2 = fbm(p * 8.0 + 13.0);
      float n3 = fbm(p * 22.0 + 31.0);
      float surface = 0.55 * n1 + 0.30 * n2 + 0.15 * n3;

      // Raking light — moves slowly across the surface.
      vec2 lightDir = normalize(vec2(cos(u_time * 0.05), 0.6));
      float rake = dot(p - 0.5, lightDir);
      float lit = smoothstep(-0.3, 0.6, rake + (surface - 0.5) * 0.6);

      vec3 col = mix(dark, light, lit * 0.85 + 0.15);

      // Carved glyphs — darker grooves.
      float g = carved(p * 1.4, u_time);
      // Modulate appearance with slow blob noise so they fade in/out.
      float reveal = smoothstep(0.45, 0.7, fbm(p * 1.2 + u_time * 0.03));
      col -= vec3(0.18, 0.16, 0.14) * g * reveal;

      // Iron-oxide cracks — sparse darker veins along low-frequency fbm valleys.
      float crack = smoothstep(0.62, 0.66, n1) * smoothstep(0.7, 0.62, n1);
      col -= vec3(0.10, 0.05, 0.02) * crack * 0.6;

      // Vignette — keeps lower thirds quieter for type.
      vec2 c = uv - 0.5;
      float vig = 1.0 - smoothstep(0.3, 1.05, length(c * vec2(0.9, 1.4)));
      col *= 0.78 + 0.22 * vig;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  // ----------------------------------------------------------------------
  // PENUMBRA — volumetric gold light shafts piercing dark cosmic fog
  // ----------------------------------------------------------------------
  const FRAG_PENUMBRA = COMMON + `
    // God-rays from an off-screen source toward the upper-right.
    float godRays(vec2 uv, vec2 src, float t) {
      vec2 d = uv - src;
      float angle = atan(d.y, d.x);
      // Many rays modulated by noise on angle.
      float r = 0.0;
      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float a = angle * (8.0 + fi * 5.0) + t * (0.05 + fi * 0.02);
        r += (0.4 + 0.6 * sin(a)) * (0.5 / (1.0 + fi));
      }
      // Falloff with distance.
      float dist = length(d);
      r *= smoothstep(1.2, 0.0, dist);
      return r;
    }

    void main() {
      vec2 uv = v_uv;
      vec2 p = uv;
      p.x *= u_res.x / u_res.y;

      // Deep cosmic background — almost-black with faint indigo.
      vec3 deep = vec3(0.045, 0.04, 0.06);
      vec3 mid  = vec3(0.10, 0.07, 0.08);
      vec3 col = mix(deep, mid, smoothstep(0.0, 1.0, uv.y));

      // Volumetric fog noise — animated.
      float fog = fbm(p * 2.5 + vec2(u_time * 0.04, u_time * 0.02));
      fog = pow(fog, 1.5);

      // Light source position drifts slowly.
      vec2 src = vec2(0.78 + 0.04 * sin(u_time * 0.1),
                      0.82 + 0.03 * cos(u_time * 0.08));
      src.x *= u_res.x / u_res.y;

      // Rays — modulated by fog so they look volumetric.
      float rays = godRays(p, src, u_time);
      rays *= 0.4 + 0.8 * fog;

      // Gold halo around source.
      float halo = smoothstep(0.8, 0.0, length(p - src));
      vec3 gold = vec3(0.95, 0.72, 0.32);

      col += gold * rays * 0.35;
      col += gold * pow(halo, 2.0) * 0.55;

      // Bronze dust motes drifting slowly through the rays.
      vec2 g = p * 30.0;
      vec2 i = floor(g);
      vec2 f = fract(g);
      float h = hash(i);
      if (h > 0.992) {
        float drift = 0.5 + 0.5 * sin(u_time * 0.6 + h * 30.0);
        float d = length(f - vec2(0.5));
        float mote = smoothstep(0.04, 0.0, d) * drift;
        // Motes brighter inside the ray cone.
        mote *= 0.3 + 0.9 * rays;
        col += gold * mote * 0.9;
      }

      // Bottom vignette toward black for type legibility.
      float vig = smoothstep(0.0, 0.6, uv.y);
      col *= mix(0.55, 1.0, vig);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const SHADERS = {
    codex: FRAG_CODEX,
    lapidary: FRAG_LAPIDARY,
    penumbra: FRAG_PENUMBRA,
  };

  function compile(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      console.error('Shader compile error:', log, src);
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  window.initHero = function (canvas, kind) {
    const frag = SHADERS[kind];
    if (!frag) {
      console.error('Unknown hero kind:', kind);
      return () => {};
    }
    const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
    if (!gl) {
      console.warn('WebGL unavailable — hero will be blank.');
      return () => {};
    }

    const v = compile(gl, gl.VERTEX_SHADER, VERT);
    const f = compile(gl, gl.FRAGMENT_SHADER, frag);
    if (!v || !f) return () => {};

    const prog = gl.createProgram();
    gl.attachShader(prog, v);
    gl.attachShader(prog, f);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(prog));
      return () => {};
    }
    gl.useProgram(prog);

    // Fullscreen triangle (covers the quad with a single tri).
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'u_res');
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');

    const mouse = [0.5, 0.5];
    function onMove(e) {
      const r = canvas.getBoundingClientRect();
      mouse[0] = (e.clientX - r.left) / r.width;
      mouse[1] = 1.0 - (e.clientY - r.top) / r.height;
    }
    canvas.addEventListener('mousemove', onMove);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }

    let raf = 0;
    let alive = true;
    // Prewarm: pretend the loop has already been running for some seconds, so
    // time-driven effects (e.g. smoke) are mid-flow on the first frame instead
    // of starting from a near-blank state.
    const prewarmSeconds = 60;
    const start = performance.now() - prewarmSeconds * 1000;
    function frame() {
      if (!alive) return;
      resize();
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (performance.now() - start) / 1000);
      gl.uniform2f(uMouse, mouse[0], mouse[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    }
    frame();

    return function teardown() {
      alive = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener('mousemove', onMove);
    };
  };
})();
