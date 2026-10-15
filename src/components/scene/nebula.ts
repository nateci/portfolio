import * as THREE from "three";
import { GPUComputationRenderer } from "three/addons/misc/GPUComputationRenderer.js";
import { COLORS, type ScaleUniform } from "./glow";
import { HASH_GLSL, NOISE_GLSL } from "./noise";

// ---------------------------------------------------------------------------
// The nebula: the flow field from the old 2D hero, rebuilt as a GPU sim.
// Positions + velocities live in float textures and are advected through 3D
// curl noise every frame (GPGPU ping-pong). Particles live inside a box that
// follows the camera's focus, so the field re-forms around every scene.
// The cursor casts a ray into the volume and particles part around it.
// ---------------------------------------------------------------------------

const VELOCITY_FRAG = /* glsl */ `
uniform float uTime;
uniform float uDt;
uniform vec3 uRayO;
uniform vec3 uRayD;
uniform float uMouse;
${NOISE_GLSL}
${HASH_GLSL}
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 p = texture2D(texturePosition, uv);
  vec4 v = texture2D(textureVelocity, uv);

  vec3 flow = curlNoise(p.xyz * 0.085 + vec3(0.0, uTime * 0.035, uTime * 0.025)) * 1.4;
  flow += vec3(0.22, 0.06, 0.0); // gentle prevailing drift
  vec3 vel = mix(v.xyz, flow, 1.0 - exp(-uDt * 1.8));

  // cursor wake: push away from the pointer ray
  if (uMouse > 0.001) {
    vec3 rel = p.xyz - uRayO;
    float t = max(dot(rel, uRayD), 0.0);
    vec3 away = rel - uRayD * t;
    float d = length(away);
    float R = 2.2 + t * 0.05;
    if (d < R) {
      float f = 1.0 - d / R;
      vel += (away / max(d, 1e-3)) * f * f * uDt * 70.0 * uMouse;
    }
  }

  // freshly respawned: drop stale momentum
  if (p.w > maxLife(uv) - uDt * 1.5) vel = flow;
  gl_FragColor = vec4(vel, length(vel));
}`;

const POSITION_FRAG = /* glsl */ `
uniform float uTime;
uniform float uDt;
uniform vec3 uFocus;
uniform vec3 uExtent;
${HASH_GLSL}
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 p = texture2D(texturePosition, uv);
  vec4 v = texture2D(textureVelocity, uv);
  p.xyz += v.xyz * uDt;
  p.w -= uDt;
  vec3 q = abs(p.xyz - uFocus) / uExtent;
  if (p.w <= 0.0 || max(q.x, max(q.y, q.z)) > 1.0) {
    vec3 r = vec3(
      hash12(uv * 91.7 + fract(uTime * 0.731)),
      hash12(uv * 53.3 + fract(uTime * 1.37)),
      hash12(uv * 17.9 - fract(uTime * 0.519)));
    p.xyz = uFocus + (r * 2.0 - 1.0) * uExtent;
    p.w = maxLife(uv);
  }
  gl_FragColor = p;
}`;

const RENDER_VERT = /* glsl */ `
uniform sampler2D tPos;
uniform sampler2D tVel;
uniform float uScale;
uniform float uIntro;
uniform vec3 uFocus;
uniform vec3 uExtent;
uniform vec3 uC0;
uniform vec3 uC1;
uniform vec3 uC2;
attribute vec2 ref;
varying vec3 vColor;
varying float vAlpha;
${HASH_GLSL}
void main() {
  vec4 p = texture2D(tPos, ref);
  vec4 v = texture2D(tVel, ref);
  vec4 mv = modelViewMatrix * vec4(p.xyz, 1.0);
  gl_Position = projectionMatrix * mv;

  float h = hash12(ref * 7.31);
  vec3 c = h < 0.55 ? uC0 : (h < 0.8 ? uC1 : uC2);
  float sp = v.w;
  c = mix(c, vec3(1.0), clamp(sp * 0.18 - 0.25, 0.0, 0.5));

  float age = maxLife(ref) - p.w;
  vec3 q = abs(p.xyz - uFocus) / uExtent;
  float edge = 1.0 - smoothstep(0.7, 1.0, max(q.x, max(q.y, q.z)));
  float depth = -mv.z;
  float near = smoothstep(0.6, 3.5, depth);
  vAlpha = smoothstep(0.0, 1.2, p.w) * smoothstep(0.0, 0.9, age) * edge * near * uIntro
         * (0.22 + min(sp * 0.16, 0.42));

  float size = (0.07 + 0.14 * hash12(ref * 3.7)) * uScale / max(depth, 0.1);
  gl_PointSize = clamp(size, 1.0, 40.0);
  vColor = c;
}`;

const RENDER_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  a = a * a * vAlpha;
  if (a < 0.002) discard;
  gl_FragColor = vec4(vColor * a, 1.0);
  #include <colorspace_fragment>
}`;

export function createNebula(
  renderer: THREE.WebGLRenderer,
  opts: { size: number; uScale: ScaleUniform; focus: THREE.Vector3; extent: THREE.Vector3 },
) {
  const { size } = opts;
  const gpu = new GPUComputationRenderer(size, size, renderer);
  // half floats are too coarse for positions, but are all some mobile GPUs render to
  if (!renderer.extensions.has("EXT_color_buffer_float")) gpu.setDataType(THREE.HalfFloatType);

  const pos0 = gpu.createTexture();
  const vel0 = gpu.createTexture();
  const pd = pos0.image.data as Float32Array;
  for (let i = 0; i < size * size; i++) {
    pd[i * 4] = opts.focus.x + (Math.random() * 2 - 1) * opts.extent.x;
    pd[i * 4 + 1] = opts.focus.y + (Math.random() * 2 - 1) * opts.extent.y;
    pd[i * 4 + 2] = opts.focus.z + (Math.random() * 2 - 1) * opts.extent.z;
    pd[i * 4 + 3] = Math.random() * 6; // staggered lives so they don't all respawn at once
  }

  const velVar = gpu.addVariable("textureVelocity", VELOCITY_FRAG, vel0);
  const posVar = gpu.addVariable("texturePosition", POSITION_FRAG, pos0);
  gpu.setVariableDependencies(velVar, [velVar, posVar]);
  gpu.setVariableDependencies(posVar, [velVar, posVar]);

  const simU = {
    uTime: { value: 0 },
    uDt: { value: 0 },
  };
  Object.assign(velVar.material.uniforms, simU, {
    uRayO: { value: new THREE.Vector3() },
    uRayD: { value: new THREE.Vector3(0, 0, -1) },
    uMouse: { value: 0 },
  });
  Object.assign(posVar.material.uniforms, simU, {
    uFocus: { value: opts.focus },
    uExtent: { value: opts.extent },
  });

  const err = gpu.init();
  if (err) throw new Error(err);

  const count = size * size;
  const geo = new THREE.BufferGeometry();
  const ref = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    ref[i * 2] = ((i % size) + 0.5) / size;
    ref[i * 2 + 1] = (Math.floor(i / size) + 0.5) / size;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute("ref", new THREE.BufferAttribute(ref, 2));

  const lin = (hex: number) => new THREE.Color(hex);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      tPos: { value: null },
      tVel: { value: null },
      uScale: opts.uScale,
      uIntro: { value: 0 },
      uFocus: { value: opts.focus },
      uExtent: { value: opts.extent },
      uC0: { value: lin(COLORS.teal) },
      uC1: { value: lin(COLORS.blue) },
      uC2: { value: lin(COLORS.violet) },
    },
    vertexShader: RENDER_VERT,
    fragmentShader: RENDER_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;

  return {
    points,
    update(dt: number, t: number, ray: THREE.Ray, mouse: number, intro: number) {
      simU.uTime.value = t;
      simU.uDt.value = dt;
      velVar.material.uniforms.uRayO.value.copy(ray.origin);
      velVar.material.uniforms.uRayD.value.copy(ray.direction);
      velVar.material.uniforms.uMouse.value = mouse;
      gpu.compute();
      mat.uniforms.tPos.value = gpu.getCurrentRenderTarget(posVar).texture;
      mat.uniforms.tVel.value = gpu.getCurrentRenderTarget(velVar).texture;
      mat.uniforms.uIntro.value = intro;
    },
    dispose() {
      gpu.dispose();
      geo.dispose();
      mat.dispose();
    },
  };
}
