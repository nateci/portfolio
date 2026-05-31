"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

// ---------------------------------------------------------------------------
// Scrolling hydrophone spectrogram. Most frames are ambient noise; occasional
// anomalies spike and get boxed by the "detector" - mimicking the inference
// pipeline flagging events in real time.
// ---------------------------------------------------------------------------

const BANDS = 28;

export function SonarDemo() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let cols: number[][] = []; // each col = intensity per band
    const anomalies: { x: number; band: number; life: number }[] = [];

    const resize = () => {
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let last = 0;
    let frame = 0;

    const heat = (v: number) => {
      // teal -> amber -> red ramp
      if (v < 0.4) return `rgba(53,214,195,${v * 0.9})`;
      if (v < 0.75) return `rgba(240,180,41,${v})`;
      return `rgba(255,93,93,${v})`;
    };

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < 55) return;
      last = t;
      frame++;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // generate a new column of "spectral" data
      const col: number[] = [];
      const isAnomaly = Math.random() < 0.05;
      const anomBand = Math.floor(Math.random() * BANDS);
      for (let b = 0; b < BANDS; b++) {
        let v = 0.1 + 0.18 * Math.random() + 0.12 * Math.sin(b * 0.5 + frame * 0.05);
        if (isAnomaly && Math.abs(b - anomBand) < 3) v = 0.7 + Math.random() * 0.3;
        col.push(Math.min(1, v));
      }
      cols.push(col);
      const maxCols = Math.ceil(w / 6);
      if (cols.length > maxCols) cols.shift();
      if (isAnomaly) anomalies.push({ x: maxCols, band: anomBand, life: 1 });

      ctx.clearRect(0, 0, w, h);
      const cw = w / maxCols;
      const bh = h / BANDS;

      cols.forEach((c, ci) => {
        c.forEach((v, b) => {
          ctx.fillStyle = heat(v);
          ctx.fillRect(ci * cw, b * bh, cw + 0.5, bh + 0.5);
        });
      });

      // anomaly detection boxes, scrolling left with the data
      for (let i = anomalies.length - 1; i >= 0; i--) {
        const a = anomalies[i];
        a.x -= 1;
        a.life -= 0.004;
        if (a.x < -4 || a.life <= 0) {
          anomalies.splice(i, 1);
          continue;
        }
        const x = a.x * cw;
        const y = (a.band - 3) * bh;
        ctx.strokeStyle = `rgba(255,93,93,${0.4 + a.life * 0.5})`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - cw * 2, y, cw * 5, bh * 7);
        ctx.fillStyle = `rgba(255,93,93,${a.life})`;
        ctx.font = "9px ui-monospace, monospace";
        ctx.fillText("⚠ contact", x - cw * 2, y - 3);
      }

      // scan line
      ctx.fillStyle = "rgba(53,214,195,0.5)";
      ctx.fillRect(cols.length * cw - cw, 0, 1.5, h);
    };

    if (reduced) {
      // static representative frame - no scrolling, no scanning
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const maxCols = Math.ceil(w / 6);
      const cw = w / maxCols;
      const bh = h / BANDS;
      for (let c = 0; c < maxCols; c++) {
        for (let b = 0; b < BANDS; b++) {
          const v = Math.min(1, 0.1 + 0.18 * Math.random() + 0.12 * Math.sin(b * 0.5 + c * 0.05));
          ctx.fillStyle = heat(v);
          ctx.fillRect(c * cw, b * bh, cw + 0.5, bh + 0.5);
        }
      }
      return () => ro.disconnect();
    }

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [reduced]);

  return (
    <div className="relative h-[300px] overflow-hidden rounded-xl border border-line bg-[#0a0d12]">
      <canvas ref={ref} className="h-full w-full" />
      <div className="pointer-events-none absolute bottom-2 left-3 font-mono text-[0.62rem] text-ink-faint">
        hydrophone spectrogram · 0–24 kHz · live anomaly detection
      </div>
    </div>
  );
}
