import * as THREE from "three";
import { COLORS, glowSprite, type SceneCtx } from "./glow";

// ---------------------------------------------------------------------------
// NOAA AUV sonar: an autonomous vehicle glides over a wireframe seabed,
// emitting sonar pings. Each ping's ring sweeps the floor; when it crosses a
// hidden contact, the contact lights up as a detection and slowly fades.
// ---------------------------------------------------------------------------

const FLOOR_Y = -3;
const HALF = 12;
const PING_EVERY = 2.4;
const PING_RANGE = 10;

export function createSonar(ctx: SceneCtx) {
  const group = new THREE.Group();
  const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } as const;

  // seabed ridgelines (static, generated once)
  const rows = 34;
  const cols = 90;
  const verts: number[] = [];
  const h = (x: number, z: number) =>
    Math.sin(x * 0.35) * 0.35 + Math.cos(z * 0.5 + x * 0.12) * 0.3 + Math.sin(x * 0.9 + z * 0.7) * 0.12;
  for (let r = 0; r < rows; r++) {
    const z = -HALF * 0.7 + (r / (rows - 1)) * HALF * 1.4;
    for (let c = 0; c < cols - 1; c++) {
      const x0 = -HALF + (c / (cols - 1)) * HALF * 2;
      const x1 = -HALF + ((c + 1) / (cols - 1)) * HALF * 2;
      verts.push(x0, FLOOR_Y + h(x0, z), z, x1, FLOOR_Y + h(x1, z), z);
    }
  }
  const floorGeo = new THREE.BufferGeometry();
  floorGeo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  const floor = new THREE.LineSegments(
    floorGeo,
    new THREE.LineBasicMaterial({ color: COLORS.blue, opacity: 0.22, ...additive }),
  );
  group.add(floor);

  // the AUV: a capsule hull with a glowing wireframe skin and a nose light
  const auv = new THREE.Group();
  const hullGeo = new THREE.CapsuleGeometry(0.32, 1.6, 6, 16);
  hullGeo.rotateZ(Math.PI / 2);
  auv.add(new THREE.Mesh(hullGeo, new THREE.MeshBasicMaterial({ color: 0x14202c })));
  auv.add(
    new THREE.Mesh(hullGeo, new THREE.MeshBasicMaterial({ color: COLORS.blue, wireframe: true, opacity: 0.35, ...additive })),
  );
  const nose = glowSprite(ctx.halo, COLORS.teal, 1.1, 0.9);
  nose.position.x = 1.15;
  auv.add(nose);
  // downward sonar cone
  const coneGeo = new THREE.ConeGeometry(2.2, 3, 32, 1, true);
  coneGeo.translate(0, -1.5, 0);
  const coneMat = new THREE.MeshBasicMaterial({ color: COLORS.blue, opacity: 0.05, side: THREE.DoubleSide, ...additive });
  auv.add(new THREE.Mesh(coneGeo, coneMat));
  group.add(auv);

  // ping rings (pooled)
  const ringGeo = new THREE.RingGeometry(0.96, 1, 96);
  ringGeo.rotateX(-Math.PI / 2);
  const rings = Array.from({ length: 4 }, () => {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: COLORS.teal, opacity: 0, side: THREE.DoubleSide, ...additive }));
    group.add(m);
    return { mesh: m, age: 99, origin: new THREE.Vector3() };
  });

  // hidden contacts on the seabed
  const contactGeo = new THREE.OctahedronGeometry(0.22, 0);
  const contacts = Array.from({ length: 7 }, () => {
    const x = (Math.random() * 2 - 1) * (HALF - 2);
    const z = (Math.random() * 2 - 1) * (HALF * 0.55);
    const mat = new THREE.MeshBasicMaterial({ color: COLORS.amber, opacity: 0.15, ...additive });
    const mesh = new THREE.Mesh(contactGeo, mat);
    mesh.position.set(x, FLOOR_Y + h(x, z) + 0.25, z);
    const halo = glowSprite(ctx.halo, COLORS.amber, 1.6, 0);
    halo.position.copy(mesh.position);
    group.add(mesh, halo);
    return { mesh, mat, halo, lit: 0 };
  });

  let pingIn = 0.5;
  const prevPos = new THREE.Vector3();

  function update(dt: number, t: number) {
    // lazy figure-eight survey pattern
    prevPos.copy(auv.position);
    auv.position.set(Math.sin(t * 0.11) * 6, 0.4 + Math.sin(t * 0.37) * 0.25, Math.sin(t * 0.22) * 2.5);
    const dx = auv.position.x - prevPos.x;
    const dz = auv.position.z - prevPos.z;
    if (Math.abs(dx) + Math.abs(dz) > 1e-5) auv.rotation.y = Math.atan2(-dz, dx);

    pingIn -= dt;
    if (pingIn <= 0) {
      pingIn = PING_EVERY;
      const r = rings.find((x) => x.age > 1.2) ?? rings[0];
      r.age = 0;
      r.origin.set(auv.position.x, FLOOR_Y + 0.05, auv.position.z);
    }

    for (const r of rings) {
      r.age += dt / PING_EVERY;
      const radius = r.age * PING_RANGE;
      r.mesh.position.copy(r.origin);
      r.mesh.scale.setScalar(Math.max(radius, 0.01));
      r.mesh.material.opacity = r.age < 1 ? (1 - r.age) * 0.8 : 0;
      if (r.age >= 1) continue;
      for (const c of contacts) {
        const d = Math.hypot(c.mesh.position.x - r.origin.x, c.mesh.position.z - r.origin.z);
        if (Math.abs(d - radius) < 0.35) c.lit = 1;
      }
    }

    for (const c of contacts) {
      c.lit = Math.max(0, c.lit - dt * 0.35);
      c.mat.opacity = 0.15 + c.lit * 0.85;
      c.halo.material.opacity = c.lit * 0.8;
      c.mesh.rotation.y = t * 0.8;
    }
  }

  return { group, update };
}
