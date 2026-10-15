import * as THREE from "three";
import { COLORS, damp, glowSprite, type SceneCtx } from "./glow";

// ---------------------------------------------------------------------------
// Experience as a constellation: one star per role, strung along a timeline
// path oldest -> newest (left -> right). Current roles burn green, incoming
// ones amber with the path to them dashed; the selected star swells and
// wears a ring.
// ---------------------------------------------------------------------------

export type StarKind = "past" | "current" | "incoming";

const KIND_COLOR: Record<StarKind, number> = {
  past: COLORS.blue,
  current: 0x46d369,
  incoming: COLORS.amber,
};

export function createConstellation(ctx: SceneCtx, kinds: StarKind[]) {
  const group = new THREE.Group();
  const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } as const;
  const n = kinds.length;

  // kinds[] is newest-first (same order as content.experience); lay out oldest on the left
  const positions = kinds.map((_, i) => {
    const slot = n - 1 - i;
    const x = (slot - (n - 1) / 2) * 4.4;
    return new THREE.Vector3(x, Math.sin(slot * 1.3) * 1.3, Math.cos(slot * 0.9) * 1.6);
  });

  // timeline path: solid through the past, dashed into anything incoming
  const ordered = [...positions].reverse();
  const curve = new THREE.CatmullRomCurve3(ordered);
  const firstIncoming = kinds.findIndex((k) => k !== "incoming");
  const splitAt = firstIncoming > 0 ? (n - 1 - firstIncoming) / (n - 1) : 1;
  const pts = curve.getPoints(200);
  const cut = Math.round(splitAt * 200);
  const solid = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts.slice(0, cut + 1)),
    new THREE.LineBasicMaterial({ color: COLORS.teal, opacity: 0.45, ...additive }),
  );
  group.add(solid);
  if (cut < 200) {
    const dashed = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts.slice(cut)),
      new THREE.LineDashedMaterial({ color: COLORS.amber, opacity: 0.6, dashSize: 0.25, gapSize: 0.2, ...additive }),
    );
    dashed.computeLineDistances();
    group.add(dashed);
  }

  const coreGeo = new THREE.IcosahedronGeometry(0.22, 2);
  const stars = kinds.map((kind, i) => {
    const color = KIND_COLOR[kind];
    const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color }));
    const halo = glowSprite(ctx.halo, color, 2, 0.6);
    const ring = glowSprite(ctx.ring, color, 0.1, 0);
    core.position.copy(positions[i]);
    halo.position.copy(positions[i]);
    ring.position.copy(positions[i]);
    group.add(core, halo, ring);
    return { core, halo, ring, kind, sel: 0, phase: Math.random() * 6 };
  });

  let selected = -1;

  function update(dt: number, t: number) {
    const k = damp(5, dt);
    stars.forEach((s, i) => {
      s.sel += ((i === selected ? 1 : 0) - s.sel) * k;
      const twinkle = s.kind === "incoming" ? 0.2 * Math.sin(t * 3 + s.phase) : 0.06 * Math.sin(t * 1.7 + s.phase);
      s.core.scale.setScalar(1 + s.sel * 0.8 + twinkle);
      s.halo.scale.setScalar(2 + s.sel * 2.2 + twinkle * 2);
      s.halo.material.opacity = 0.5 + s.sel * 0.4;
      s.ring.scale.setScalar(1.2 + s.sel * 1.8 + Math.sin(t * 2) * 0.08 * s.sel);
      s.ring.material.opacity = s.sel * 0.85;
    });
  }

  return {
    group,
    update,
    /** local-space star positions (newest-first, matching content.experience) */
    positions,
    select(i: number) {
      selected = i;
    },
  };
}
