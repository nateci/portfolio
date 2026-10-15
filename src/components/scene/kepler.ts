import * as THREE from "three";
import { COLORS, GlowPoints, damp, glowSprite, type SceneCtx } from "./glow";

// ---------------------------------------------------------------------------
// Kepler, literally: a 5-node Raft cluster as a planetary system. Nodes orbit
// the core obeying Kepler's third law (w ~ r^-1.5). The leader streams
// heartbeat arcs to followers; every so often it crashes, a follower times
// out, campaigns (vote requests out, votes back) and takes over in a flare.
// ---------------------------------------------------------------------------

type Role = "follower" | "candidate" | "leader" | "down";
type Kind = "hb" | "req" | "vote";
type Pulse = { from: number; to: number; t: number; dur: number; kind: Kind; onArrive?: () => void };

const N = 5;

const ROLE_STYLE: Record<Role, { color: number; scale: number; halo: number; haloOpacity: number }> = {
  leader: { color: COLORS.teal, scale: 1.45, halo: 2.8, haloOpacity: 0.95 },
  follower: { color: COLORS.blue, scale: 1, halo: 1.4, haloOpacity: 0.55 },
  candidate: { color: COLORS.amber, scale: 1.25, halo: 2.2, haloOpacity: 0.9 },
  down: { color: COLORS.red, scale: 0.7, halo: 0.9, haloOpacity: 0.25 },
};

const PULSE_COLOR: Record<Kind, THREE.Color> = {
  hb: new THREE.Color(COLORS.teal),
  req: new THREE.Color(COLORS.amber),
  vote: new THREE.Color(COLORS.blue),
};

export function createKepler(ctx: SceneCtx) {
  const group = new THREE.Group();
  const system = new THREE.Group();
  system.rotation.set(0.34, 0, -0.16);
  group.add(system);

  // core -------------------------------------------------------------------
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.62, 48, 32), new THREE.MeshBasicMaterial({ color: 0x0d2a2a }));
  const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending } as const;
  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.1, 1),
    new THREE.MeshBasicMaterial({ color: COLORS.teal, wireframe: true, opacity: 0.4, ...additive }),
  );
  const shell2 = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.82, 0),
    new THREE.MeshBasicMaterial({ color: COLORS.violet, wireframe: true, opacity: 0.55, ...additive }),
  );
  const coreHalo = glowSprite(ctx.halo, COLORS.teal, 4.2, 0.45);
  system.add(core, shell, shell2, coreHalo);

  // nodes + orbits -----------------------------------------------------------
  const nodeGeo = new THREE.SphereGeometry(0.22, 24, 16);
  const nodes = Array.from({ length: N }, (_, i) => {
    const r = 2.8 + i * 1.08;
    const tilt = new THREE.Quaternion().setFromEuler(
      new THREE.Euler((Math.random() - 0.5) * 0.4, Math.random() * Math.PI, (Math.random() - 0.5) * 0.4),
    );
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k < 160; k++) {
      const a = (k / 160) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r * 0.94).applyQuaternion(tilt));
    }
    const ringMat = new THREE.LineBasicMaterial({ color: COLORS.line, opacity: 0.7, ...additive });
    const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), ringMat);
    const mat = new THREE.MeshBasicMaterial({ color: COLORS.blue });
    const mesh = new THREE.Mesh(nodeGeo, mat);
    const halo = glowSprite(ctx.halo, COLORS.blue, 1.4, 0.55);
    system.add(ring, mesh, halo);
    return {
      r,
      tilt,
      phase: i * 2.39 + Math.random(),
      speed: 0.42 * Math.pow(2.8 / r, 1.5),
      role: "follower" as Role,
      mesh,
      mat,
      halo,
      ringMat,
      pos: new THREE.Vector3(),
      color: new THREE.Color(COLORS.blue),
      scale: 1,
      blip: 0,
    };
  });

  // election flares ---------------------------------------------------------
  const flares = Array.from({ length: 4 }, () => {
    const s = glowSprite(ctx.ring, COLORS.teal, 0.1, 0);
    system.add(s);
    return { sprite: s, life: 1, node: 0 };
  });
  const flare = (node: number, color: number) => {
    const f = flares.find((x) => x.life >= 1) ?? flares[0];
    f.life = 0;
    f.node = node;
    f.sprite.material.color.set(color);
  };

  const glow = new GlowPoints(600, ctx.uScale);
  system.add(glow.points);

  // raft state machine -------------------------------------------------------
  const pulses: Pulse[] = [];
  let leader = 0;
  nodes[0].role = "leader";
  let hbTimer = 0;
  let leaderAge = 0;
  let leaderTTL = 7;
  let electionIn = -1;
  let downNode = -1;
  let recoverIn = -1;
  let epoch = 0;

  const send = (from: number, to: number, kind: Kind, onArrive?: () => void) =>
    pulses.push({ from, to, t: 0, dur: kind === "hb" ? 0.6 : 0.75, kind, onArrive });

  const crash = () => {
    nodes[leader].role = "down";
    flare(leader, COLORS.red);
    downNode = leader;
    recoverIn = 3.8;
    leader = -1;
    electionIn = 1.0;
    epoch++;
  };

  const becomeLeader = (c: number) => {
    nodes[c].role = "leader";
    leader = c;
    leaderAge = 0;
    leaderTTL = 6.5 + Math.random() * 3;
    hbTimer = 0;
    flare(c, COLORS.teal);
  };

  const startElection = () => {
    const pool = nodes.map((n, i) => (n.role === "follower" ? i : -1)).filter((i) => i >= 0);
    const c = pool[Math.floor(Math.random() * pool.length)];
    nodes[c].role = "candidate";
    const my = ++epoch;
    let votes = 1;
    nodes.forEach((n, i) => {
      if (i === c || n.role === "down") return;
      send(c, i, "req", () => {
        if (epoch !== my) return;
        send(i, c, "vote", () => {
          if (epoch !== my || nodes[c].role !== "candidate") return;
          if (++votes > N / 2) becomeLeader(c);
        });
      });
    });
  };

  const raftStep = (dt: number) => {
    if (leader >= 0) {
      leaderAge += dt;
      hbTimer -= dt;
      if (hbTimer <= 0) {
        hbTimer = 0.9;
        nodes.forEach((n, i) => {
          if (i !== leader && n.role !== "down") send(leader, i, "hb", () => (nodes[i].blip = 1));
        });
      }
      if (leaderAge > leaderTTL) crash();
    } else if (electionIn >= 0) {
      electionIn -= dt;
      if (electionIn < 0) startElection();
    }
    if (downNode >= 0) {
      recoverIn -= dt;
      if (recoverIn < 0) {
        nodes[downNode].role = "follower";
        downNode = -1;
      }
    }
  };

  // per-frame ---------------------------------------------------------------
  const tmpColor = new THREE.Color();
  const ringIdle = new THREE.Color(COLORS.line);
  const ctrl = new THREE.Vector3();
  const pt = new THREE.Vector3();
  const bez = (a: THREE.Vector3, c: THREE.Vector3, b: THREE.Vector3, t: number, out: THREE.Vector3) => {
    const u = 1 - t;
    return out
      .copy(a)
      .multiplyScalar(u * u)
      .addScaledVector(c, 2 * u * t)
      .addScaledVector(b, t * t);
  };

  function update(dt: number, t: number) {
    raftStep(dt);

    shell.rotation.set(t * 0.11, t * 0.17, 0);
    shell2.rotation.set(-t * 0.2, t * 0.07, t * 0.13);
    coreHalo.material.opacity = 0.4 + Math.sin(t * 1.7) * 0.06;

    const k = damp(6, dt);
    for (const n of nodes) {
      const a = n.phase + t * n.speed;
      n.pos.set(Math.cos(a) * n.r, 0, Math.sin(a) * n.r * 0.94).applyQuaternion(n.tilt);
      const st = ROLE_STYLE[n.role];
      n.color.lerp(tmpColor.set(st.color), k);
      n.blip = Math.max(0, n.blip - dt * 3);
      const pulse = n.role === "candidate" ? Math.sin(t * 14) * 0.12 : 0;
      n.scale += (st.scale + pulse + n.blip * 0.35 - n.scale) * k;
      n.mesh.position.copy(n.pos);
      n.mesh.scale.setScalar(n.scale);
      n.mat.color.copy(n.color);
      n.halo.position.copy(n.pos);
      n.halo.scale.setScalar(st.halo * (0.85 + n.scale * 0.15) + n.blip * 0.6);
      n.halo.material.color.copy(n.color);
      n.halo.material.opacity += (st.haloOpacity - n.halo.material.opacity) * k;
      const lit = n.role === "leader" || n.role === "candidate";
      n.ringMat.color.lerp(lit ? tmpColor.set(st.color).multiplyScalar(0.55) : ringIdle, k);
    }

    for (const f of flares) {
      if (f.life >= 1) continue;
      f.life = Math.min(1, f.life + dt / 1.1);
      f.sprite.position.copy(nodes[f.node].pos);
      f.sprite.scale.setScalar(0.5 + f.life * 6);
      f.sprite.material.opacity = (1 - f.life) ** 2;
    }

    glow.begin();
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.t += dt / p.dur;
      if (p.t >= 1) {
        pulses.splice(i, 1);
        p.onArrive?.();
        continue;
      }
      const a = nodes[p.from].pos;
      const b = nodes[p.to].pos;
      // arc up and over the core
      ctrl
        .copy(a)
        .add(b)
        .multiplyScalar(0.18)
        .add(pt.set(0, 1.6 + a.distanceTo(b) * 0.2, 0));
      const c = PULSE_COLOR[p.kind];
      const trail = p.kind === "hb" ? 10 : 7;
      for (let j = 0; j < trail; j++) {
        const tt = p.t - j * 0.028;
        if (tt < 0) break;
        const fall = 1 - j / trail;
        glow.push(bez(a, ctrl, b, tt, pt), c, (p.kind === "hb" ? 0.32 : 0.4) * fall, fall);
      }
    }
    glow.end();
  }

  return { group, update };
}
