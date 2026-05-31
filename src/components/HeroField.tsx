"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

// ---------------------------------------------------------------------------
// "The Fabric" - an animated flow field. Particles stream along an animated
// value-noise field, leaving glowing additive trails, and part around the
// cursor like a wake. Hero-only; dissolves into the page via a mask.
//
// Perf: capped DPR, additive sprite blitting (no per-particle shadowBlur),
// trail-fade instead of full clears, paused off-screen / when tab hidden,
// throttled particle count on small screens, static frame under reduced-motion.
// ---------------------------------------------------------------------------

// soft circular sprite, pre-rendered once per color for cheap glow
function makeSprite(rgb: [number, number, number], size = 64) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  const [r, gr, b] = rgb;
  g.addColorStop(0, `rgba(${r},${gr},${b},0.9)`);
  g.addColorStop(0.25, `rgba(${r},${gr},${b},0.35)`);
  g.addColorStop(1, `rgba(${r},${gr},${b},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}

// compact value-noise (smooth, organic, no deps)
function makeNoise() {
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const grad = (h: number) => (perm[h & 255] / 255) * 2 - 1; // pseudo value at lattice
  return (x: number, y: number) => {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const aa = grad(perm[xi] + yi);
    const ba = grad(perm[xi + 1] + yi);
    const ab = grad(perm[xi] + yi + 1);
    const bb = grad(perm[xi + 1] + yi + 1);
    return lerp(lerp(aa, ba, u), lerp(ab, bb, u), v); // ~[-1,1]
  };
}

type Particle = { x: number; y: number; vx: number; vy: number; sprite: number; size: number };

const PALETTE: [number, number, number][] = [
  [53, 214, 195], // teal (weighted most)
  [53, 214, 195],
  [74, 163, 255], // blue
  [167, 139, 250], // violet
];

export function HeroField() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const sprites = PALETTE.map((c) => makeSprite(c));
    const noise = makeNoise();

    let w = 0;
    let h = 0;
    let particles: Particle[] = [];
    const mouse = { x: -9999, y: -9999, active: false };

    const SCALE = 0.0016; // noise frequency
    const FLOW = 0.06; // steer strength
    const FRICTION = 0.94;
    const MAX_SPEED = 1.8;
    const MOUSE_R = 150;

    const count = () => {
      const area = w * h;
      const target = Math.round(area / 1300); // ~density
      return Math.max(120, Math.min(1500, target));
    };

    const spawn = (): Particle => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: 0,
      vy: 0,
      sprite: Math.floor(Math.random() * sprites.length),
      size: 8 + Math.random() * 22,
    });

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = Array.from({ length: count() }, spawn);
      // prime background
      ctx.fillStyle = "#08090b";
      ctx.fillRect(0, 0, w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };
    const onLeave = () => (mouse.active = false);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseout", onLeave);

    // ---- reduced motion: a single calm static frame, then stop -----------
    if (reduced) {
      ctx.fillStyle = "#08090b";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (const p of particles) {
        const s = p.size;
        ctx.globalAlpha = 0.5;
        ctx.drawImage(sprites[p.sprite], p.x - s / 2, p.y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      return () => {
        ro.disconnect();
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseout", onLeave);
      };
    }

    let raf = 0;
    let zx = 0;
    let zy = 0;
    let running = true;

    const step = () => {
      if (!running) return;
      raf = requestAnimationFrame(step);

      // trail fade: paint a translucent bg instead of clearing
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(8,9,11,0.11)";
      ctx.fillRect(0, 0, w, h);

      // animate the field by drifting the noise sample origin
      zx += 0.18;
      zy += 0.05;

      ctx.globalCompositeOperation = "lighter";
      for (const p of particles) {
        const angle = noise(p.x * SCALE + zx * SCALE, p.y * SCALE + zy * SCALE) * Math.PI * 3;
        p.vx += Math.cos(angle) * FLOW;
        p.vy += Math.sin(angle) * FLOW;

        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < MOUSE_R * MOUSE_R) {
            const d = Math.sqrt(d2) || 1;
            const f = (1 - d / MOUSE_R) * 1.4;
            p.vx += (dx / d) * f;
            p.vy += (dy / d) * f;
          }
        }

        p.vx *= FRICTION;
        p.vy *= FRICTION;
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > MAX_SPEED) {
          p.vx = (p.vx / sp) * MAX_SPEED;
          p.vy = (p.vy / sp) * MAX_SPEED;
        }
        p.x += p.vx;
        p.y += p.vy;

        // wrap around edges
        if (p.x < -20) p.x = w + 20;
        else if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        else if (p.y > h + 20) p.y = -20;

        const s = p.size;
        ctx.globalAlpha = 0.18 + Math.min(0.5, sp * 0.28);
        ctx.drawImage(sprites[p.sprite], p.x - s / 2, p.y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
    };

    // pause when scrolled out of view or tab hidden
    const io = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting && !document.hidden;
        if (visible && !running) {
          running = true;
          raf = requestAnimationFrame(step);
        } else if (!visible) {
          running = false;
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(step);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    raf = requestAnimationFrame(step);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
    };
  }, [reduced]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full [mask-image:linear-gradient(to_bottom,#000_55%,transparent_100%)]"
    />
  );
}
