import * as THREE from "three";
import { COLORS, GlowPoints, damp, type SceneCtx } from "./glow";

// ---------------------------------------------------------------------------
// Kepler's storage engine as architecture: writes stream into the memtable,
// it flushes SSTables into L0, and over-full levels compact down into the
// next (the bottom level merges into itself so the loop never ends).
// ---------------------------------------------------------------------------

const LEVELS = [
  { y: 2.4, w: 5.2, cap: 3, color: COLORS.teal },
  { y: 0.0, w: 7.6, cap: 3, color: COLORS.blue },
  { y: -2.4, w: 10.4, cap: 4, color: COLORS.violet },
  { y: -4.8, w: 13.6, cap: 5, color: COLORS.amber },
];
const MEM_Y = 5.0;
const DEPTH = 2.8;
const BLOCK_H = 0.42;
const GAP = 0.2;
const FLUSH_AT = 6;

type Block = {
  mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>;
  edge: THREE.LineSegments<THREE.EdgesGeometry, THREE.LineBasicMaterial>;
  width: number;
  target: THREE.Vector3;
  grow: number;
  flash: number;
};
type Spark = { from: THREE.Vector3; t: number };

export function createLsm(ctx: SceneCtx) {
  const group = new THREE.Group();
  const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } as const;
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const edgeGeo = new THREE.EdgesGeometry(boxGeo);

  // slabs ------------------------------------------------------------------
  const slabs = LEVELS.map((lv) => {
    const mesh = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: lv.color, opacity: 0.06, ...additive }));
    mesh.scale.set(lv.w, 0.08, DEPTH);
    mesh.position.y = lv.y;
    const edgeMat = new THREE.LineBasicMaterial({ color: lv.color, opacity: 0.45, ...additive });
    const edge = new THREE.LineSegments(edgeGeo, edgeMat);
    edge.scale.copy(mesh.scale);
    edge.position.copy(mesh.position);
    group.add(mesh, edge);
    return { edgeMat, flash: 0 };
  });

  // memtable -----------------------------------------------------------------
  const memEdgeMat = new THREE.LineBasicMaterial({ color: COLORS.teal, opacity: 0.8, ...additive });
  const memEdge = new THREE.LineSegments(edgeGeo, memEdgeMat);
  memEdge.scale.set(2.4, 0.5, DEPTH * 0.7);
  memEdge.position.y = MEM_Y;
  const memFill = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: COLORS.teal, opacity: 0.35, ...additive }));
  memFill.position.y = MEM_Y;
  group.add(memEdge, memFill);
  let fill = 0;
  let memFlash = 0;

  // blocks -------------------------------------------------------------------
  const levels: Block[][] = LEVELS.map(() => []);
  const merging: { blocks: Block[]; dest: number; t: number }[] = [];
  const restY = (l: number) => LEVELS[l].y + 0.04 + BLOCK_H / 2;

  const makeBlock = (level: number, width: number, at: THREE.Vector3): Block => {
    const color = LEVELS[level].color;
    const mesh = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color, opacity: 0.22, ...additive }));
    const edge = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color, opacity: 0.95, ...additive }));
    mesh.position.copy(at);
    edge.position.copy(at);
    group.add(mesh, edge);
    return { mesh, edge, width, target: at.clone(), grow: 0, flash: 1 };
  };

  const removeBlock = (b: Block) => {
    group.remove(b.mesh, b.edge);
    b.mesh.material.dispose();
    b.edge.material.dispose();
  };

  const maybeCompact = () => {
    LEVELS.forEach((lv, i) => {
      if (levels[i].length <= lv.cap) return;
      const dest = Math.min(i + 1, LEVELS.length - 1);
      const blocks = levels[i].splice(0);
      for (const b of blocks) b.target.set((Math.random() - 0.5) * 0.6, restY(dest), 0);
      merging.push({ blocks, dest, t: 0.9 });
    });
  };

  const flush = () => {
    fill = 0;
    memFlash = 1;
    levels[0].push(makeBlock(0, 0.9 + Math.random() * 0.6, new THREE.Vector3(0, MEM_Y, 0)));
    maybeCompact();
  };

  // seed a lived-in tree so the first view isn't empty
  for (const [l, n] of [[1, 2], [2, 3], [3, 4]] as const) {
    for (let i = 0; i < n; i++) levels[l].push(makeBlock(l, 1.2 + Math.random() * 1.4, new THREE.Vector3(0, restY(l), 0)));
  }

  // write sparks -------------------------------------------------------------
  const glow = new GlowPoints(200, ctx.uScale);
  group.add(glow.points);
  const sparks: Spark[] = [];
  const sparkColor = new THREE.Color(COLORS.teal);
  const memPos = new THREE.Vector3(0, MEM_Y, 0);
  const pt = new THREE.Vector3();
  let writeIn = 0;

  function update(dt: number, t: number) {
    group.rotation.y = -0.45 + Math.sin(t * 0.12) * 0.35;

    writeIn -= dt;
    if (writeIn <= 0) {
      writeIn = 0.32 + Math.random() * 0.2;
      const dir = new THREE.Vector3().randomDirection();
      dir.y = Math.abs(dir.y) * 0.8 + 0.2;
      sparks.push({ from: dir.multiplyScalar(7).add(memPos), t: 0 });
    }

    glow.begin();
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.t += dt / 0.6;
      if (s.t >= 1) {
        sparks.splice(i, 1);
        if (++fill >= FLUSH_AT) flush();
        continue;
      }
      const e = s.t * s.t; // accelerate into the memtable
      for (let j = 0; j < 6; j++) {
        const tt = Math.max(0, e - j * 0.03);
        const fall = 1 - j / 6;
        glow.push(pt.copy(s.from).lerp(memPos, tt), sparkColor, 0.28 * fall, fall);
      }
    }
    glow.end();

    const k = damp(5, dt);
    memFlash = Math.max(0, memFlash - dt * 2.5);
    const fillW = 2.3 * (fill / FLUSH_AT);
    memFill.scale.x += (Math.max(fillW, 0.001) - memFill.scale.x) * k;
    memFill.scale.y = 0.4;
    memFill.scale.z = DEPTH * 0.65;
    memFill.position.x = -1.15 + memFill.scale.x / 2;
    memEdgeMat.opacity = 0.6 + memFlash * 0.4;

    for (let m = merging.length - 1; m >= 0; m--) {
      const job = merging[m];
      job.t -= dt;
      if (job.t > 0) continue;
      merging.splice(m, 1);
      const total = job.blocks.reduce((s, b) => s + b.width, 0);
      const at = job.blocks[0]?.mesh.position.clone() ?? new THREE.Vector3(0, restY(job.dest), 0);
      job.blocks.forEach(removeBlock);
      const lvl = levels[job.dest];
      const merged = makeBlock(job.dest, Math.min(total * 0.62, LEVELS[job.dest].w * 0.4), at);
      lvl.splice(Math.floor(Math.random() * (lvl.length + 1)), 0, merged);
      slabs[job.dest].flash = 1;
      maybeCompact();
    }

    // pack each level left-to-right, centered
    levels.forEach((lvl, l) => {
      const total = lvl.reduce((s, b) => s + b.width, 0) + GAP * Math.max(0, lvl.length - 1);
      let x = -total / 2;
      for (const b of lvl) {
        b.target.set(x + b.width / 2, restY(l), 0);
        x += b.width + GAP;
      }
    });

    const drive = (b: Block) => {
      b.grow = Math.min(1, b.grow + dt * 2.5);
      b.flash = Math.max(0, b.flash - dt * 1.5);
      b.mesh.position.lerp(b.target, k);
      b.mesh.scale.set(b.width * b.grow, BLOCK_H, DEPTH * 0.8);
      b.edge.position.copy(b.mesh.position);
      b.edge.scale.copy(b.mesh.scale);
      b.mesh.material.opacity = 0.18 + b.flash * 0.5;
    };
    levels.forEach((lvl) => lvl.forEach(drive));
    merging.forEach((job) => job.blocks.forEach(drive));

    for (const s of slabs) {
      s.flash = Math.max(0, s.flash - dt * 1.8);
      s.edgeMat.opacity = 0.4 + s.flash * 0.6;
    }
  }

  return { group, update };
}
