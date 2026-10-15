import * as THREE from "three";
import { COLORS, glowSprite, type SceneCtx } from "./glow";
import { NOISE_GLSL } from "./noise";

// ---------------------------------------------------------------------------
// Sentinel's world: a telemetry landscape. Ridgelines of live metrics scroll
// toward the viewer, a scan line sweeps for anomalies, and incidents erupt as
// red spikes (with a beacon) before being remediated back to baseline.
// ---------------------------------------------------------------------------

const SPIKES = 3;
const HALF_X = 15;
const HALF_Z = 9;

const VERT = /* glsl */ `
uniform float uTime;
uniform float uScan;
uniform vec4 uSpikes[${SPIKES}];
uniform vec3 uCA;
uniform vec3 uCB;
uniform vec3 uCR;
varying vec3 vColor;
${NOISE_GLSL}
void main() {
  vec3 p = position;
  float zz = p.z - uTime * 1.1; // the series scrolls toward the camera
  float h = snoise(vec3(p.x * 0.12, zz * 0.12, uTime * 0.05)) * 0.8
          + snoise(vec3(p.x * 0.4, zz * 0.4, 1.7)) * 0.22;
  h = pow(h * 0.5 + 0.5, 1.6) * 2.2;
  float spike = 0.0;
  for (int i = 0; i < ${SPIKES}; i++) {
    vec2 d = p.xz - uSpikes[i].xy;
    spike += uSpikes[i].z * exp(-dot(d, d) * 0.8);
  }
  p.y = h + spike * 3.6;

  float scan = exp(-pow((p.z - uScan) * 1.3, 2.0));
  vec3 c = mix(uCB, uCA, clamp(h * 0.55, 0.0, 1.0));
  c = mix(c, uCR, clamp(spike * 1.6, 0.0, 1.0));
  float fade = (1.0 - smoothstep(${HALF_X - 5}.0, ${HALF_X}.0, abs(p.x)))
             * (1.0 - smoothstep(${HALF_Z - 3}.0, ${HALF_Z}.0, abs(p.z)));
  vColor = (c * (0.2 + spike * 0.6) + vec3(scan * 0.3)) * fade;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const FRAG = /* glsl */ `
varying vec3 vColor;
void main() {
  gl_FragColor = vec4(vColor, 1.0);
  #include <colorspace_fragment>
}`;

export function createTerrain(ctx: SceneCtx, opts: { rows: number; cols: number }) {
  const group = new THREE.Group();
  const { rows, cols } = opts;

  // one LineSegments holding every ridgeline (pairs of vertices per segment)
  const verts = new Float32Array(rows * (cols - 1) * 2 * 3);
  let o = 0;
  for (let r = 0; r < rows; r++) {
    const z = -HALF_Z + (r / (rows - 1)) * HALF_Z * 2;
    for (let c = 0; c < cols - 1; c++) {
      const x0 = -HALF_X + (c / (cols - 1)) * HALF_X * 2;
      const x1 = -HALF_X + ((c + 1) / (cols - 1)) * HALF_X * 2;
      verts.set([x0, 0, z, x1, 0, z], o);
      o += 6;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));

  const spikes = Array.from({ length: SPIKES }, () => new THREE.Vector4(0, 0, 0, 0));
  const uniforms = {
    uTime: { value: 0 },
    uScan: { value: -HALF_Z },
    uSpikes: { value: spikes },
    uCA: { value: new THREE.Color(COLORS.teal) },
    uCB: { value: new THREE.Color(COLORS.blue) },
    uCR: { value: new THREE.Color(COLORS.red) },
  };
  const lines = new THREE.LineSegments(
    geo,
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  lines.frustumCulled = false;
  group.add(lines);

  // incident lifecycle: erupt -> hold -> remediate -> quiet -> elsewhere
  const incidents = spikes.map((_, i) => {
    const beacon = glowSprite(ctx.halo, COLORS.red, 1, 0);
    group.add(beacon);
    return { t: -i * 2.2, beacon };
  });
  const place = (v: THREE.Vector4) => v.set((Math.random() * 2 - 1) * 9, (Math.random() * 2 - 1) * 5, 0, 0);
  spikes.forEach(place);

  function update(dt: number, t: number) {
    uniforms.uTime.value = t;
    uniforms.uScan.value = -HALF_Z + ((t * 4.5) % (HALF_Z * 2 + 6));
    incidents.forEach((inc, i) => {
      inc.t += dt;
      const s = spikes[i];
      const tt = inc.t;
      const amp = tt < 0 ? 0 : tt < 0.6 ? tt / 0.6 : tt < 2.4 ? 1 : tt < 4 ? 1 - (tt - 2.4) / 1.6 : 0;
      if (tt > 5.5) {
        inc.t = -Math.random() * 2;
        place(s);
      }
      s.z = amp;
      inc.beacon.position.set(s.x, 2 + amp * 3.6, s.y);
      inc.beacon.scale.setScalar(0.6 + amp * 2.2);
      inc.beacon.material.opacity = amp * (0.75 + Math.sin(t * 9) * 0.25);
    });
  }

  return { group, update };
}
