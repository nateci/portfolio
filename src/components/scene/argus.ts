import * as THREE from "three";
import { COLORS, GlowPoints, damp, glowSprite, type SceneCtx } from "./glow";

// ---------------------------------------------------------------------------
// Argus: a stream of transactions flows into a scoring gate. Most pass and
// continue downstream; the flagged few are pulled out of the stream into a
// quarantine vault, and the gate flares red as each one is caught.
// ---------------------------------------------------------------------------

type Txn = {
  p: THREE.Vector3;
  v: THREE.Vector3;
  fraud: boolean;
  scored: boolean;
  settled: number; // seconds spent in the vault (fraud only)
};

const START_X = -13;
const END_X = 13;
const VAULT = new THREE.Vector3(8, 4.6, 0);
const FRAUD_RATE = 0.06;

export function createArgus(ctx: SceneCtx) {
  const group = new THREE.Group();
  const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } as const;

  // scoring gate: a ring facing down the stream
  const gateMat = new THREE.MeshBasicMaterial({ color: COLORS.amber, opacity: 0.9, ...additive });
  const gate = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.05, 8, 96), gateMat);
  gate.rotation.y = Math.PI / 2;
  const gateInnerMat = new THREE.MeshBasicMaterial({ color: COLORS.amber, opacity: 0.35, wireframe: true, ...additive });
  const gateInner = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.3, 6, 48), gateInnerMat);
  gateInner.rotation.y = Math.PI / 2;
  const gateHalo = glowSprite(ctx.halo, COLORS.amber, 6, 0.25);
  group.add(gate, gateInner, gateHalo);

  // quarantine vault
  const vaultEdgeMat = new THREE.LineBasicMaterial({ color: COLORS.red, opacity: 0.6, ...additive });
  const vault = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.2, 2.2, 2.2)), vaultEdgeMat);
  vault.position.copy(VAULT);
  const vaultHalo = glowSprite(ctx.halo, COLORS.red, 4, 0.15);
  vaultHalo.position.copy(VAULT);
  group.add(vault, vaultHalo);

  // faint lane guides
  const laneMat = new THREE.LineBasicMaterial({ color: COLORS.line, opacity: 0.8, ...additive });
  for (const y of [-1.6, 1.6]) {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(START_X, y, 0), new THREE.Vector3(END_X, y * 0.5, 0)]);
    group.add(new THREE.Line(g, laneMat));
  }

  const glow = new GlowPoints(1400, ctx.uScale);
  group.add(glow.points);

  const txns: Txn[] = [];
  const cIn = new THREE.Color(COLORS.ink).multiplyScalar(0.55);
  const cOk = new THREE.Color(COLORS.teal);
  const cBad = new THREE.Color(COLORS.red);
  const tmp = new THREE.Vector3();
  const tail = new THREE.Vector3();
  const gateColor = new THREE.Color(COLORS.amber);
  const gateBase = new THREE.Color(COLORS.amber);
  let spawnIn = 0;
  let flare = 0;

  const spawn = () => {
    const r = Math.sqrt(Math.random()) * 1.4;
    const a = Math.random() * Math.PI * 2;
    txns.push({
      p: new THREE.Vector3(START_X, Math.sin(a) * r, Math.cos(a) * r),
      v: new THREE.Vector3(3 + Math.random() * 1.6, 0, 0),
      fraud: Math.random() < FRAUD_RATE,
      scored: false,
      settled: 0,
    });
  };

  function update(dt: number, t: number) {
    spawnIn -= dt;
    while (spawnIn <= 0) {
      spawnIn += 1 / 22;
      spawn();
    }

    gateInner.rotation.x = t * 0.4;
    flare = Math.max(0, flare - dt * 2.2);
    gateColor.copy(gateBase).lerp(cBad, flare);
    gateMat.color.copy(gateColor);
    gateInnerMat.color.copy(gateColor);
    gateHalo.material.color.copy(gateColor);
    gateHalo.material.opacity = 0.22 + flare * 0.5;
    vault.rotation.set(t * 0.3, t * 0.45, 0);
    vaultHalo.material.opacity = 0.12 + flare * 0.3;

    const k = damp(2.5, dt);
    glow.begin();
    for (let i = txns.length - 1; i >= 0; i--) {
      const x = txns[i];
      if (!x.scored && x.p.x >= 0) {
        x.scored = true;
        if (x.fraud) flare = 1;
      }

      if (x.scored && x.fraud) {
        if (x.p.distanceTo(VAULT) < 0.9) {
          x.settled += dt;
          x.v.multiplyScalar(1 - k);
          if (x.settled > 3.5) {
            txns.splice(i, 1);
            continue;
          }
        } else {
          // steer out of the stream toward the vault
          tmp.subVectors(VAULT, x.p).normalize().multiplyScalar(4.2);
          x.v.lerp(tmp, k);
        }
      } else if (x.scored) {
        // passed: tighten toward the downstream lane
        x.v.y += -x.p.y * dt * 0.6;
        x.v.z += -x.p.z * dt * 0.6;
      }

      x.p.addScaledVector(x.v, dt);
      if (x.p.x > END_X) {
        txns.splice(i, 1);
        continue;
      }

      const c = !x.scored ? cIn : x.fraud ? cBad : cOk;
      const fade = x.fraud ? 1 - Math.max(0, x.settled - 2.5) : Math.min(1, (END_X - x.p.x) / 3);
      const size = x.fraud && x.scored ? 0.3 : 0.18;
      glow.push(x.p, c, size, fade);
      // short motion tail
      const sp = x.v.length();
      if (sp > 0.5) {
        tail.copy(x.v).multiplyScalar(-0.05);
        for (let j = 1; j <= 3; j++) glow.push(tmp.copy(x.p).addScaledVector(tail, j), c, size * (1 - j / 4), fade * (1 - j / 4));
      }
    }
    glow.end();
  }

  return { group, update };
}
