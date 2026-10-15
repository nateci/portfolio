import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { experience } from "@/lib/content";
import type { Destination } from "./bus";
import { COLORS, damp, disposeTree, makeHaloTexture, makeRingTexture, type SceneCtx } from "./glow";
import { createKepler } from "./kepler";
import { createLsm } from "./lsm";
import { createTerrain } from "./terrain";
import { createArgus } from "./argus";
import { createSonar } from "./sonar";
import { createConstellation, type StarKind } from "./constellation";
import { createNebula } from "./nebula";

// ---------------------------------------------------------------------------
// One persistent WebGL world behind the site. It runs in one of two modes:
//
//  - "nav" (the main app): the UI picks a named destination (a project, a
//    role, ...) and the camera flies there. Each destination frames its
//    subject off-center so the HTML panel beside it never covers it.
//  - "scroll" (the classic page): scroll position blends between chapter
//    keyframes, Kepler -> LSM -> terrain -> wide shot -> home.
//
// Perf: capped DPR, bloom desktop-only, quarter-size sim on mobile, loop
// paused while the tab is hidden, and a one-shot downgrade (no bloom, DPR 1)
// if frames run slow. Reduced motion renders still frames only.
// ---------------------------------------------------------------------------

export type WorldOptions = { reduced: boolean; mobile: boolean; mode: "nav" | "scroll" };

const KEPLER_AT = new THREE.Vector3(0, 0, 0);
const LSM_AT = new THREE.Vector3(0, -28, -6);
const TERRAIN_AT = new THREE.Vector3(0, -54, -4);
const ARGUS_AT = new THREE.Vector3(46, -22, -10);
const SONAR_AT = new THREE.Vector3(-46, -32, -8);
const EXP_AT = new THREE.Vector3(0, 28, -8);
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const at = (base: THREE.Vector3, x: number, y: number, z: number) => base.clone().add(v(x, y, z));

/** sx/sy: where the subject should sit on screen (NDC) so panels don't cover it */
type Key = { pos: THREE.Vector3; look: THREE.Vector3; extent: number; sx?: number; sy?: number };

function scrollKeys(aspect: number): Key[] {
  const wide = aspect > 1.15;
  return [
    { pos: v(0, 2.6, wide ? 14 : 21), look: v(wide ? -4.8 : 0, wide ? -1.4 : -4, 0), extent: 1 },
    { pos: at(LSM_AT, 7, 4.5, wide ? 15 : 22), look: at(LSM_AT, 0, -0.5, 0), extent: 1 },
    { pos: at(TERRAIN_AT, 0, 6, wide ? 15 : 21), look: at(TERRAIN_AT, 0, 6.5, -2), extent: 1 },
    { pos: v(26, -16, wide ? 64 : 84), look: v(0, -27, -4), extent: 2.2 },
    { pos: v(-7, 5, wide ? 17 : 24), look: v(wide ? -2.5 : 0, 0, 0), extent: 1 },
  ];
}

function navKey(dest: Destination, aspect: number, stars: THREE.Vector3[]): Key {
  const wide = aspect > 1.15;
  // desktop: panel on the left, subject right of center. phone: panel is a
  // bottom sheet, subject in the top part of the screen.
  const side = (k: Key, sx = 0.56, sy = 0.5): Key => (wide ? { ...k, sx, sy: 0 } : { ...k, sx: 0, sy });
  const far = wide ? 1 : 1.5;

  if (dest.startsWith("experience:")) {
    const i = THREE.MathUtils.clamp(Number(dest.split(":")[1]) || 0, 0, stars.length - 1);
    const s = EXP_AT.clone().add(stars[i]);
    return side({ pos: at(s, -2, 2.2, 17 * far), look: s, extent: 1 });
  }
  switch (dest) {
    case "projects": {
      const c = v(0, -27, -9);
      return { pos: at(c, 0, 16, wide ? 122 : 200), look: c, extent: 3.4, sx: 0, sy: wide ? 0.2 : 0.3 };
    }
    case "kepler":
      return side({ pos: at(KEPLER_AT, 0, 3, 15 * far), look: KEPLER_AT.clone(), extent: 1 });
    case "lsm":
      return side({ pos: at(LSM_AT, 7, 4.5, 16 * far), look: at(LSM_AT, 0, -0.5, 0), extent: 1 });
    case "sentinel":
      return side({ pos: at(TERRAIN_AT, 0, 7, 15 * far), look: at(TERRAIN_AT, 0, -1.5, -1), extent: 1 });
    case "argus":
      return side({ pos: at(ARGUS_AT, -4, 3.5, 17 * far), look: ARGUS_AT.clone(), extent: 1 });
    case "sonar":
      return side({ pos: at(SONAR_AT, 4, 4, 16 * far), look: at(SONAR_AT, 0, -1, 0), extent: 1 });
    case "stack":
      return side({ pos: at(KEPLER_AT, 12, -1.5, 9 * far), look: KEPLER_AT.clone(), extent: 1 });
    case "contact":
      return side({ pos: at(KEPLER_AT, -7, 5, 17 * far), look: KEPLER_AT.clone(), extent: 1 });
    case "home":
    default:
      return wide
        ? { pos: v(0, 2.6, 14), look: KEPLER_AT.clone(), extent: 1, sx: 0.36, sy: 0.1 }
        : { pos: v(0, 2.6, 21), look: KEPLER_AT.clone(), extent: 1, sx: 0, sy: 0.45 };
  }
}

const smooth = (x: number) => x * x * (3 - 2 * x);

export function createWorld(canvas: HTMLCanvasElement, opts: WorldOptions) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  let dpr = Math.min(window.devicePixelRatio || 1, opts.mobile ? 1 : 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(COLORS.bg, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(COLORS.bg, 0.007);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);

  const ctx: SceneCtx = { halo: makeHaloTexture(), ring: makeRingTexture(), uScale: { value: 1000 } };
  const kinds: StarKind[] = experience.map((e) => (e.incoming ? "incoming" : e.current ? "current" : "past"));
  const kepler = createKepler(ctx);
  const lsm = createLsm(ctx);
  const terrain = createTerrain(ctx, opts.mobile ? { rows: 36, cols: 110 } : { rows: 56, cols: 180 });
  const argus = createArgus(ctx);
  const sonar = createSonar(ctx);
  const constellation = createConstellation(ctx, kinds);
  const placed: [{ group: THREE.Group }, THREE.Vector3][] = [
    [kepler, KEPLER_AT],
    [lsm, LSM_AT],
    [terrain, TERRAIN_AT],
    [argus, ARGUS_AT],
    [sonar, SONAR_AT],
    [constellation, EXP_AT],
  ];
  for (const [sc, p] of placed) {
    sc.group.position.copy(p);
    scene.add(sc.group);
  }
  const scenes = [kepler, lsm, terrain, argus, sonar, constellation];

  const baseExtent = v(22, 13, 16);
  const focus = new THREE.Vector3();
  const extent = baseExtent.clone();
  const nebula = createNebula(renderer, { size: opts.mobile ? 64 : 96, uScale: ctx.uScale, focus, extent });
  scene.add(nebula.points);

  let composer: EffectComposer | null = null;
  if (!opts.mobile) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.5, 0.14));
    composer.addPass(new OutputPass());
  }

  // camera rig -------------------------------------------------------------
  let keys = scrollKeys(1.6);
  let dest: Destination = "home";
  let sTarget = 0;
  let s = 0;
  const goalPos = new THREE.Vector3();
  const goalLook = new THREE.Vector3();
  let goalExtent = 1;
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const pointer = new THREE.Vector2();
  const pointerSmooth = new THREE.Vector2();
  let pointerActive = false;
  let mouse = 0;
  const raycaster = new THREE.Raycaster();
  const dir = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const WORLD_UP = new THREE.Vector3(0, 1, 0);

  // translate (not rotate) the camera so the subject lands at NDC (sx, sy)
  const frameKey = (k: Key) => {
    goalPos.copy(k.pos);
    goalLook.copy(k.look);
    goalExtent = k.extent;
    if (!k.sx && !k.sy) return;
    dir.subVectors(k.look, k.pos);
    const halfH = dir.length() * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    dir.normalize();
    right.crossVectors(dir, WORLD_UP).normalize();
    up.crossVectors(right, dir);
    const shift = right.multiplyScalar(-(k.sx ?? 0) * halfH * camera.aspect).addScaledVector(up, -(k.sy ?? 0) * halfH);
    goalPos.add(shift);
    goalLook.add(shift);
  };

  const sampleScroll = (sv: number) => {
    const i = Math.min(Math.floor(sv), keys.length - 2);
    const f = smooth(THREE.MathUtils.clamp(sv - i, 0, 1));
    goalPos.lerpVectors(keys[i].pos, keys[i + 1].pos, f);
    goalLook.lerpVectors(keys[i].look, keys[i + 1].look, f);
    goalExtent = THREE.MathUtils.lerp(keys[i].extent, keys[i + 1].extent, f);
  };

  const updateGoal = () => {
    if (opts.mode === "nav") frameKey(navKey(dest, camera.aspect, constellation.positions));
    else sampleScroll(s);
  };

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer?.setPixelRatio(dpr);
    composer?.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    ctx.uScale.value = (h * dpr) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    keys = scrollKeys(camera.aspect);
    updateGoal();
  };
  resize();
  camPos.copy(goalPos);
  camLook.copy(goalLook);

  let t = 0;
  let intro = 0;
  let readDim = 1;

  const frame = (dt: number) => {
    t += dt;
    intro = Math.min(1, intro + dt / 1.6);

    if (opts.mode === "scroll") s += (sTarget - s) * damp(3.5, dt);
    updateGoal();
    const rate = opts.mode === "nav" ? 2.4 : 3;
    camPos.lerp(goalPos, damp(rate, dt));
    camLook.lerp(goalLook, damp(rate, dt));

    // gentle idle drift + pointer parallax (damped beside panels, so reaching
    // for a button doesn't swing the subject behind the panel)
    pointerSmooth.lerp(pointer, damp(3, dt));
    const sway = opts.mode === "nav" && dest !== "home" && dest !== "projects" ? 0.3 : 1;
    camera.position
      .copy(camPos)
      .add(
        v(
          (Math.sin(t * 0.13) * 0.6 + pointerSmooth.x * 1.4) * sway,
          (Math.sin(t * 0.17) * 0.35 + pointerSmooth.y * 0.8) * sway,
          0,
        ),
      );
    camera.lookAt(camLook);
    camera.updateMatrixWorld();

    focus.lerp(camLook, damp(2, dt));
    extent.copy(baseExtent).multiplyScalar(goalExtent);

    mouse += ((pointerActive ? 1 : 0) - mouse) * damp(4, dt);
    raycaster.setFromCamera(pointer, camera);

    // dim the nebula while the visitor is reading: any destination with a
    // text panel in nav mode, or a settled non-hero chapter in scroll mode
    let target = 1;
    if (opts.mode === "nav") {
      if (dest !== "home" && dest !== "projects") target = 0.55;
    } else {
      const nearest = Math.round(s);
      const settled = 1 - Math.min(1, Math.abs(s - nearest) * 3);
      if (nearest >= 1) target = 1 - 0.5 * settled;
    }
    readDim += (target - readDim) * damp(3, dt);

    const near = goalExtent > 2 ? Infinity : 42;
    for (const [sc, p] of placed) sc.group.visible = p.distanceTo(camLook) < near;
    for (const sc of scenes) if (sc.group.visible) sc.update(dt, t);
    nebula.update(dt, t, raycaster.ray, mouse, intro * readDim);

    if (composer) composer.render(dt);
    else renderer.render(scene, camera);
  };

  // reduced motion: settle the sims once off-screen, then only draw stills
  let warmed = false;
  const still = () => {
    if (!warmed) {
      warmed = true;
      intro = 1;
      for (let i = 0; i < 90; i++) {
        t += 1 / 60;
        for (const sc of scenes) sc.update(1 / 60, t);
        nebula.update(1 / 60, t, raycaster.ray, 0, 1);
      }
    }
    updateGoal();
    camPos.copy(goalPos);
    camLook.copy(goalLook);
    readDim = 1;
    frame(0);
  };

  let raf = 0;
  let running = false;
  let last = 0;
  let slowFrames = 0;
  let downgraded = false;

  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000 || 0, 1 / 20);
    last = now;
    // one-shot downgrade if we're consistently under ~50fps
    if (!downgraded && t > 3) {
      slowFrames = dt > 0.021 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
      if (slowFrames > 45) {
        downgraded = true;
        composer?.dispose();
        composer = null;
        dpr = 1;
        resize();
      }
    }
    frame(dt);
  };

  const start = () => {
    if (running || opts.reduced) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  const ro = new ResizeObserver(() => {
    resize();
    if (opts.reduced) still();
  });
  ro.observe(canvas);

  if (opts.reduced) still();
  else start();

  return {
    /** scroll mode: continuous chapter index, 0 = hero ... 4 = contact */
    setScroll(chapter: number) {
      sTarget = THREE.MathUtils.clamp(chapter, 0, keys.length - 1);
    },
    /** nav mode: fly to a named destination */
    goTo(d: Destination) {
      dest = d;
      const star = d.startsWith("experience:") ? Number(d.split(":")[1]) : -1;
      constellation.select(star);
      if (opts.reduced) still();
    },
    /** pointer in NDC (-1..1); inactive when it leaves the window or on touch */
    setPointer(x: number, y: number, active: boolean) {
      pointer.set(x, y);
      pointerActive = active;
    },
    start,
    stop,
    dispose() {
      stop();
      ro.disconnect();
      nebula.dispose();
      disposeTree(scene);
      ctx.halo.dispose();
      ctx.ring.dispose();
      composer?.dispose();
      renderer.dispose();
    },
  };
}

export type World = ReturnType<typeof createWorld>;
