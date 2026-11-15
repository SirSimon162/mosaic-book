"use client";

import { useEffect, useRef, useState } from "react";

export type FolderPaletteKey = "PDF" | "WEBSITE" | "YOUTUBE" | "TEXT" | "MARKDOWN";

/** 4 pastel RGB stops flattened as 12 floats (0..1). */
type Palette = readonly [
  number, number, number,
  number, number, number,
  number, number, number,
  number, number, number,
];

export const FOLDER_PALETTES: Record<FolderPaletteKey, Palette> = {
  PDF: [
    1.0, 0.45, 0.72, // hot pink
    1.0, 0.78, 0.88, // soft pink
    1.0, 0.9, 0.55, // yellow
    0.98, 0.86, 0.94,
  ],
  WEBSITE: [
    0.35, 0.72, 1.0, // clear blue
    0.72, 0.86, 1.0, // powder
    1.0, 0.55, 0.82, // pink accent
    0.9, 0.94, 1.0,
  ],
  YOUTUBE: [
    1.0, 0.32, 0.55, // rose
    1.0, 0.72, 0.35, // amber
    1.0, 0.88, 0.45, // yellow
    1.0, 0.9, 0.86,
  ],
  TEXT: [
    1.0, 0.86, 0.28, // yellow
    1.0, 0.55, 0.78, // pink
    0.95, 0.95, 0.72, // pale lemon
    1.0, 0.94, 0.88,
  ],
  MARKDOWN: [
    0.2, 0.78, 0.72, // teal
    1.0, 0.88, 0.35, // yellow
    1.0, 0.55, 0.78, // pink
    0.88, 0.96, 0.94,
  ],
};

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_dim;
uniform vec3 u_c0;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;

float hash(vec2 p) {
  vec2 q = fract(p * vec2(0.1031, 0.1030));
  q += dot(q, q.yx + 33.33 + u_seed);
  return fract((q.x + q.y) * q.x);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p = p * 2.02 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

vec3 palette(float t) {
  t = clamp(t, 0.0, 1.0);
  if (t < 0.33) return mix(u_c0, u_c1, t / 0.33);
  if (t < 0.66) return mix(u_c1, u_c2, (t - 0.33) / 0.33);
  return mix(u_c2, u_c3, (t - 0.66) / 0.34);
}

vec3 field(vec2 uv, float t) {
  vec2 p = uv * 1.25 + vec2(u_seed * 0.13, u_seed * 0.07);
  vec2 q = vec2(
    fbm(p + t * 0.04),
    fbm(p + vec2(5.2, 1.3) - t * 0.03)
  );
  float f = fbm(p + 1.0 * q);
  f = mix(0.25, 0.75, smoothstep(0.2, 0.8, f));
  return palette(f);
}

float softLight(float base, float blend) {
  return blend < 0.5
    ? base - (1.0 - 2.0 * blend) * base * (1.0 - base)
    : base + (2.0 * blend - 1.0) * (sqrt(max(base, 0.0)) - base);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 base = uv;
  base.x *= aspect;

  float t = u_time;
  vec3 col = 0.5 * (field(base, t) + field(base + vec2(0.002, -0.0015), t));

  float vig = smoothstep(1.2, 0.4, length(uv - 0.5));
  col *= mix(0.88, 1.05, vig);
  col = mix(col, col * 1.08, 0.35);

  float grain = hash(floor(gl_FragCoord.xy));
  col.r = softLight(col.r, mix(0.5, grain, 0.04));
  col.g = softLight(col.g, mix(0.5, grain, 0.04));
  col.b = softLight(col.b, mix(0.5, grain, 0.04));

  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, col * 0.72, u_dim);
  col = mix(col, vec3(luma * 0.75), u_dim * 0.3);

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext) {
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function CssShaderFallback({
  palette,
  dimmed,
  className,
}: {
  palette: FolderPaletteKey;
  dimmed?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`m-folder-css-shader${dimmed ? " is-dim" : ""} ${className ?? ""}`.trim()}
      data-palette={palette}
      aria-hidden
    >
      <span className="m-folder-css-blob a" />
      <span className="m-folder-css-blob b" />
      <span className="m-folder-css-blob c" />
    </div>
  );
}

export function FolderShaderArt({
  palette,
  seed = 0,
  dimmed = false,
  hovered = false,
  className = "",
}: {
  palette: FolderPaletteKey;
  seed?: number;
  dimmed?: boolean;
  hovered?: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoveredRef = useRef(hovered);
  const startLoopRef = useRef<(() => void) | null>(null);
  const [webgl, setWebgl] = useState(true);
  const colors = FOLDER_PALETTES[palette];

  useEffect(() => {
    hoveredRef.current = hovered;
    if (hovered) startLoopRef.current?.();
  }, [hovered]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
      powerPreference: "low-power",
    });
    if (!gl) {
      setWebgl(false);
      return;
    }

    const program = createProgram(gl);
    if (!program) {
      setWebgl(false);
      return;
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, "a_pos");
    const uResolution = gl.getUniformLocation(program, "u_resolution");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uSeed = gl.getUniformLocation(program, "u_seed");
    const uDim = gl.getUniformLocation(program, "u_dim");
    const uC0 = gl.getUniformLocation(program, "u_c0");
    const uC1 = gl.getUniformLocation(program, "u_c1");
    const uC2 = gl.getUniformLocation(program, "u_c2");
    const uC3 = gl.getUniformLocation(program, "u_c3");

    gl.useProgram(program);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform3f(uC0, colors[0], colors[1], colors[2]);
    gl.uniform3f(uC1, colors[3], colors[4], colors[5]);
    gl.uniform3f(uC2, colors[6], colors[7], colors[8]);
    gl.uniform3f(uC3, colors[9], colors[10], colors[11]);
    gl.uniform1f(uSeed, seed);
    gl.uniform1f(uDim, dimmed ? 1 : 0);

    const reduced = prefersReducedMotion();
    let alive = true;
    let frame = 0;
    let looping = false;
    let time = 12 + seed * 7.3;
    let velocity = 0;
    let lastNow = 0;

    function resize() {
      if (!canvas || !gl) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        return true;
      }
      return false;
    }

    function paint() {
      if (!gl || !canvas) return;
      resize();
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, time);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function tick(now: number) {
      if (!alive || !gl) return;
      const dt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000));
      lastNow = now;

      const target = hoveredRef.current && !reduced ? 1 : 0;
      const rate = target > velocity ? 4.2 : 4.0;
      velocity += (target - velocity) * (1 - Math.exp(-dt * rate));
      if (velocity < 0.001 && target === 0) velocity = 0;

      if (velocity > 0) time += dt * 0.12 * velocity;

      paint();

      if (velocity > 0 || target > 0) {
        frame = window.requestAnimationFrame(tick);
      } else {
        looping = false;
      }
    }

    function ensureLoop() {
      if (reduced || looping || !alive) return;
      looping = true;
      lastNow = performance.now();
      frame = window.requestAnimationFrame(tick);
    }

    startLoopRef.current = () => {
      if (hoveredRef.current) ensureLoop();
    };

    paint();
    if (hoveredRef.current) ensureLoop();

    const ro = new ResizeObserver(() => {
      if (resize()) paint();
    });
    ro.observe(canvas);

    return () => {
      alive = false;
      looping = false;
      startLoopRef.current = null;
      cancelAnimationFrame(frame);
      ro.disconnect();
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
    };
  }, [colors, dimmed, seed]);

  if (!webgl) {
    return <CssShaderFallback palette={palette} dimmed={dimmed} className={className} />;
  }

  return <canvas ref={canvasRef} className={`m-folder-shader ${className}`.trim()} aria-hidden />;
}

/** Clean 20px type mark for the visible peek area. */
export function FolderPeekIcon({ tone }: { tone?: string }) {
  const common = {
    className: "m-folder-peek-icon",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    "aria-hidden": true as const,
  };

  if (tone === "WEBSITE") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.25" />
        <path d="M3.75 12h16.5M12 3.75c2.4 2.6 2.4 13.9 0 16.5M12 3.75c-2.4 2.6-2.4 13.9 0 16.5" />
      </svg>
    );
  }
  if (tone === "YOUTUBE") {
    return (
      <svg {...common}>
        <rect x="3.5" y="6.5" width="17" height="11" rx="2.5" />
        <path d="M10.5 9.75v4.5L14.75 12 10.5 9.75Z" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (tone === "MARKDOWN") {
    return (
      <svg {...common}>
        <path d="M8 7v10M16 7v10M8 12h8" strokeLinecap="round" />
      </svg>
    );
  }
  if (tone === "TEXT") {
    return (
      <svg {...common}>
        <path d="M7 5.5h10M12 5.5v13M8.5 18.5h7" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M8 4.5h5.5L16.5 7.5V19.5H8z" strokeLinejoin="round" />
      <path d="M13.5 4.5V7.5H16.5" strokeLinejoin="round" />
    </svg>
  );
}
