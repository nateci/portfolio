"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import type { World } from "./scene/world";
import { onDestination } from "./scene/bus";

// ---------------------------------------------------------------------------
// Fixed full-viewport WebGL backdrop for the whole site. three.js is loaded
// lazily so it never blocks first paint. Scroll position is mapped to a
// continuous "chapter" index from the section anchors below; the world flies
// the camera between scenes accordingly.
//
// If WebGL is unavailable, <html data-scene="off"> re-enables the old 2D hero
// field (see .scene-fallback in globals.css).
// ---------------------------------------------------------------------------

const CHAPTERS = ["top", "work", "experience", "stack", "contact"];

// Each section boundary contributes 0..1 as the next section's top travels
// from 85% to 35% of the viewport height, so the camera holds on a scene
// while you read it and flies as the next one scrolls in. Short trailing
// sections that can't scroll that far finish their flight at max scroll.
function chapterFromScroll() {
  const vh = window.innerHeight;
  const y = window.scrollY;
  const maxScroll = document.documentElement.scrollHeight - vh;
  let s = 0;
  for (const id of CHAPTERS.slice(1)) {
    const el = document.getElementById(id);
    if (!el) continue;
    const top = el.getBoundingClientRect().top + y;
    const end = Math.min(top - vh * 0.35, maxScroll);
    s += Math.min(1, Math.max(0, (y - (end - vh * 0.5)) / (vh * 0.5)));
  }
  return s;
}

/** "nav": camera follows the UI's destination (main app). "scroll": camera follows scroll (classic page). */
export function SceneCanvas({ mode = "scroll" }: { mode?: "nav" | "scroll" }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion() ?? false;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const root = document.documentElement;
    let world: World | null = null;
    let cancelled = false;
    const cleanups: (() => void)[] = [];

    (async () => {
      try {
        const { createWorld } = await import("./scene/world");
        if (cancelled) return;
        const mobile = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
        world = createWorld(canvas, { reduced, mobile, mode });
      } catch (err) {
        console.warn("3D scene unavailable, falling back to 2D:", err);
        root.dataset.scene = "off";
        return;
      }
      root.dataset.scene = "on";
      const w = world;

      const onScroll = () => w.setScroll(chapterFromScroll());
      if (mode === "scroll") {
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
      } else {
        cleanups.push(onDestination((d) => w.goTo(d)));
      }

      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        w.setPointer((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1, true);
      };
      const onLeave = () => w.setPointer(0, 0, false);
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);

      const onVisibility = () => (document.hidden ? w.stop() : w.start());
      document.addEventListener("visibilitychange", onVisibility);

      cleanups.push(() => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        window.removeEventListener("pointermove", onMove);
        document.documentElement.removeEventListener("pointerleave", onLeave);
        document.removeEventListener("visibilitychange", onVisibility);
      });
    })();

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
      world?.dispose();
      delete root.dataset.scene;
    };
  }, [reduced, mode]);

  return (
    <>
      <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />
      {/* soft vignette so section copy outside the panels stays legible */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_45%,rgba(8,9,11,0.6)_100%)]"
      />
    </>
  );
}
