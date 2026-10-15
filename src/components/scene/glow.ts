import * as THREE from "three";

// Shared palette (mirrors the @theme tokens in globals.css) and glow helpers
// used by every scene in the world.

export const COLORS = {
  bg: 0x08090b,
  line: 0x2b3140,
  ink: 0xe8edf2,
  teal: 0x35d6c3,
  blue: 0x4aa3ff,
  violet: 0xa78bfa,
  amber: 0xf0b429,
  red: 0xff5d5d,
} as const;

// pixels-per-world-unit-at-depth-1, shared by every point material so point
// sprites are sized in world units: px = size * uScale / depth
export type ScaleUniform = { value: number };

export type SceneCtx = {
  halo: THREE.Texture;
  ring: THREE.Texture;
  uScale: ScaleUniform;
};

function canvasTexture(draw: (ctx: CanvasRenderingContext2D, s: number) => void, size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d")!, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeHaloTexture() {
  return canvasTexture((ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.18, "rgba(255,255,255,0.45)");
    g.addColorStop(0.5, "rgba(255,255,255,0.08)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

export function makeRingTexture() {
  return canvasTexture((ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.72, "rgba(255,255,255,0)");
    g.addColorStop(0.84, "rgba(255,255,255,1)");
    g.addColorStop(0.92, "rgba(255,255,255,0.15)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

export function glowSprite(map: THREE.Texture, color: THREE.ColorRepresentation, scale: number, opacity = 1) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map,
      color,
      opacity,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  s.scale.setScalar(scale);
  return s;
}

// A dynamic pool of soft additive points, refilled every frame. Used for
// heartbeat pulses, write sparks, anything small that glows and moves.
export class GlowPoints {
  readonly points: THREE.Points;
  private readonly pos: Float32Array;
  private readonly col: Float32Array;
  private readonly size: Float32Array;
  private readonly geo: THREE.BufferGeometry;
  private n = 0;

  constructor(
    private readonly max: number,
    uScale: ScaleUniform,
  ) {
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute("color", new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute("size", new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uScale },
      vertexShader: /* glsl */ `
        uniform float uScale;
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp(size * uScale / max(-mv.z, 0.1), 1.0, 96.0);
          vColor = color;
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          a *= a;
          gl_FragColor = vec4(vColor * a, 1.0);
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
  }

  begin() {
    this.n = 0;
  }

  push(p: THREE.Vector3, c: THREE.Color, size: number, alpha = 1) {
    if (this.n >= this.max) return;
    const i = this.n++;
    this.pos[i * 3] = p.x;
    this.pos[i * 3 + 1] = p.y;
    this.pos[i * 3 + 2] = p.z;
    // additive blend: alpha folds into the color
    this.col[i * 3] = c.r * alpha;
    this.col[i * 3 + 1] = c.g * alpha;
    this.col[i * 3 + 2] = c.b * alpha;
    this.size[i] = size;
  }

  end() {
    this.geo.setDrawRange(0, this.n);
    for (const name of ["position", "color", "size"]) {
      (this.geo.getAttribute(name) as THREE.BufferAttribute).needsUpdate = true;
    }
  }
}

// frame-rate independent exponential smoothing factor
export const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

export function disposeTree(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const mat of mats) mat.dispose();
  });
}
