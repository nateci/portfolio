"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

type Metric = {
  label: string;
  unit: string;
  color: string;
  base: number;
  jitter: number;
  fmt: (v: number) => string;
};

const METRICS: Metric[] = [
  { label: "p95 latency", unit: "ms", color: "#35d6c3", base: 12, jitter: 6, fmt: (v) => v.toFixed(1) },
  { label: "throughput", unit: "k ops/s", color: "#4aa3ff", base: 48, jitter: 14, fmt: (v) => v.toFixed(0) },
  { label: "uptime", unit: "%", color: "#46d369", base: 99.97, jitter: 0.03, fmt: (v) => v.toFixed(2) },
  { label: "commit log", unit: "idx", color: "#f0b429", base: 1040, jitter: 0, fmt: (v) => v.toFixed(0) },
];

function Sparkline({ color, seed }: { color: string; seed: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const data = useRef<number[]>(
    Array.from({ length: 48 }, (_, i) => 0.5 + 0.3 * Math.sin(i * 0.4 + seed)),
  );

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    let last = 0;

    const draw = (t: number, advance = true) => {
      if (advance) raf = requestAnimationFrame((nt) => draw(nt));
      if (advance && t - last < 90) return; // ~11fps shift, cheap
      last = t;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const arr = data.current;
      if (advance) {
        arr.shift();
        const prev = arr[arr.length - 1];
        arr.push(Math.max(0.08, Math.min(0.92, prev + (Math.random() - 0.5) * 0.35)));
      }

      const step = w / (arr.length - 1);
      ctx.beginPath();
      arr.forEach((v, i) => {
        const x = i * step;
        const y = h - v * h;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      // glow
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.stroke();

      // fill
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.shadowBlur = 0;
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, `${color}33`);
      grad.addColorStop(1, `${color}00`);
      ctx.fillStyle = grad;
      ctx.fill();
    };

    if (reduced) {
      draw(0, false); // single static frame, no animation
    } else {
      raf = requestAnimationFrame((t) => draw(t));
    }
    return () => cancelAnimationFrame(raf);
  }, [color, seed, reduced]);

  return <canvas ref={ref} className="h-10 w-full" />;
}

function Tile({ metric, index }: { metric: Metric; index: number }) {
  const reduced = useReducedMotion();
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (reduced) {
      setVal(metric.base);
      return;
    }

    let raf = 0;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let start = 0;
    const dur = 1200;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // ease-out

    const startJitter = () => {
      intervalId = setInterval(() => {
        setVal((v) => {
          if (metric.label === "commit log") return v + Math.floor(Math.random() * 4);
          const target = metric.base + (Math.random() - 0.5) * metric.jitter;
          return v + (target - v) * 0.3;
        });
      }, 900);
    };

    // count up 0 → base on first view, then hand off to live ticking
    const countUp = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / dur);
      setVal(metric.base * ease(p));
      if (p < 1) raf = requestAnimationFrame(countUp);
      else startJitter();
    };
    raf = requestAnimationFrame(countUp);

    return () => {
      cancelAnimationFrame(raf);
      if (intervalId) clearInterval(intervalId);
    };
  }, [metric, reduced]);

  return (
    <div className="panel flex flex-col justify-between p-4">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">{metric.label}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-mono text-2xl tabular-nums text-ink">{metric.fmt(val)}</span>
        <span className="font-mono text-xs text-ink-faint">{metric.unit}</span>
      </div>
      <div className="mt-2">
        <Sparkline color={metric.color} seed={index * 1.7} />
      </div>
    </div>
  );
}

export function Telemetry() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {METRICS.map((m, i) => (
        <Tile key={m.label} metric={m} index={i} />
      ))}
    </div>
  );
}
