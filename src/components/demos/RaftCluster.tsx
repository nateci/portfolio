"use client";

import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import { useReducedMotion } from "motion/react";
import { loadCluster, type KeplerSnapshot } from "@/lib/kepler";

// ---------------------------------------------------------------------------
// This is NOT a simulation. It drives the real `kepler-raft` Raft FSM compiled
// to WebAssembly (see crates/kepler-wasm). Every election, replication, and
// commit you see is the actual Rust consensus code running in your browser -
// the canvas just visualizes the snapshots it emits.
// ---------------------------------------------------------------------------

const N = 5;
const COL = {
  bg: "#0a0d12",
  line: "#202632",
  leader: "#46d369",
  follower: "#4aa3ff",
  candidate: "#f0b429",
  dead: "#3a4150",
  append: "#35d6c3",
  ack: "#4aa3ff",
  vote: "#f0b429",
  snapshot: "#a78bfa",
};

const KEYS = ["user:42", "cart:7", "sess:a1", "ord:99", "doc:x", "idx:0", "lock:m", "kv:zeta"];

type Pulse = { from: number; to: number; t: number; speed: number; kind: string };

export type RaftHandle = { write: () => void; killLeader: () => void };
type LogEntry = { term: number; key: string; committed: boolean };
type Props = {
  onState?: (s: { term: number; leader: number; log: LogEntry[]; phase: string }) => void;
};

export const RaftCluster = forwardRef<RaftHandle, Props>(function RaftCluster({ onState }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  // wasm cluster + live view, kept in refs so the imperative handle and the
  // rAF loop can all reach them without re-rendering React.
  const clusterRef = useRef<Awaited<ReturnType<typeof loadCluster>> | null>(null);
  const snapRef = useRef<KeplerSnapshot | null>(null);
  const pulsesRef = useRef<Pulse[]>([]);
  const keyiRef = useRef(0);
  const refreshRef = useRef<() => void>(() => {});

  const nextKey = () => KEYS[keyiRef.current++ % KEYS.length];

  useImperativeHandle(ref, () => ({
    write: () => {
      const c = clusterRef.current;
      if (!c) return;
      c.write(nextKey());
      refreshRef.current();
    },
    killLeader: () => {
      const c = clusterRef.current;
      if (!c) return;
      const id = c.kill_leader();
      refreshRef.current();
      if (id > 0) {
        // bring the downed node back after a few seconds - it rejoins as a
        // follower once it hears the (real) new leader's heartbeats
        setTimeout(() => {
          c.revive(id);
          refreshRef.current();
        }, 4200);
      }
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let disposed = false;
    let raf = 0;
    let tickTimer: ReturnType<typeof setInterval> | undefined;

    const resize = () => {
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const positions = (w: number, h: number, n: number) => {
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.34;
      return Array.from({ length: n }, (_, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
      });
    };

    const refresh = () => {
      const c = clusterRef.current;
      if (!c) return;
      const snap: KeplerSnapshot = JSON.parse(c.snapshot());
      snapRef.current = snap;
      for (const p of snap.pulses) {
        pulsesRef.current.push({
          from: p.from,
          to: p.to,
          t: 0,
          speed: 0.014 + Math.random() * 0.01,
          kind: p.kind,
        });
      }
      onState?.({
        term: snap.term,
        leader: snap.leader,
        log: snap.log.slice(-9).map((e) => ({ term: e.term, key: e.key, committed: e.committed })),
        phase: snap.leader >= 0 ? "stable" : "electing",
      });
    };
    refreshRef.current = refresh;

    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      const snap = snapRef.current;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (!snap) {
        ctx.fillStyle = "#5a6373";
        ctx.font = "11px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText("booting kepler-wasm…", w / 2, h / 2);
        return;
      }
      const pos = positions(w, h, snap.nodes.length);
      const idIdx = (id: number) => id - 1; // ids are 1..n

      // edges
      ctx.lineWidth = 1;
      ctx.strokeStyle = COL.line;
      for (let i = 0; i < pos.length; i++) {
        for (let j = i + 1; j < pos.length; j++) {
          ctx.beginPath();
          ctx.moveTo(pos[i].x, pos[i].y);
          ctx.lineTo(pos[j].x, pos[j].y);
          ctx.stroke();
        }
      }

      // pulses
      const pulses = pulsesRef.current;
      for (let k = pulses.length - 1; k >= 0; k--) {
        const p = pulses[k];
        p.t += p.speed;
        if (p.t >= 1) {
          pulses.splice(k, 1);
          continue;
        }
        const a = pos[idIdx(p.from)];
        const b = pos[idIdx(p.to)];
        if (!a || !b) continue;
        const x = a.x + (b.x - a.x) * p.t;
        const y = a.y + (b.y - a.y) * p.t;
        const c =
          p.kind === "vote" || p.kind === "voteResp"
            ? COL.vote
            : p.kind === "ack"
              ? COL.ack
              : p.kind === "snapshot"
                ? COL.snapshot
                : COL.append;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = c;
        ctx.shadowColor = c;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // nodes
      const tt = t / 1000;
      for (const node of snap.nodes) {
        const p = pos[idIdx(node.id)];
        if (!p) continue;
        const color =
          node.role === "leader"
            ? COL.leader
            : node.role === "candidate"
              ? COL.candidate
              : node.role === "dead"
                ? COL.dead
                : COL.follower;

        if (node.role === "leader") {
          const pulse = reduced ? 0.4 : 0.5 + 0.5 * Math.sin(tt * 3);
          ctx.beginPath();
          ctx.arc(p.x, p.y, 16 + pulse * 8, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(70,211,105,${0.35 * (1 - pulse)})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        if (node.role === "candidate") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 16 + ((tt * 40) % 16), 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(240,180,41,0.4)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
        ctx.fillStyle = COL.bg;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = node.role === "dead" ? 0 : 10;
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = node.role === "dead" ? COL.dead : "#e8edf2";
        ctx.font = "600 10px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`n${node.id}`, p.x, p.y - 0.5);

        ctx.fillStyle = "#5a6373";
        ctx.font = "9px ui-monospace, monospace";
        ctx.fillText(node.role === "dead" ? "down" : `c=${node.commit}`, p.x, p.y + 24);
      }
    };

    (async () => {
      try {
        const cluster = await loadCluster(N);
        if (disposed) {
          cluster.free();
          return;
        }
        clusterRef.current = cluster;
        refresh();

        if (reduced) {
          // seed a populated, committed state and render a single static frame
          for (let i = 0; i < 3; i++) cluster.write(nextKey());
          refresh();
          pulsesRef.current = [];
          raf = requestAnimationFrame(draw);
          // one frame is enough; cancel the loop next tick
          setTimeout(() => cancelAnimationFrame(raf), 60);
          return;
        }

        raf = requestAnimationFrame(draw);
        tickTimer = setInterval(() => {
          cluster.tick();
          if (Math.random() < 0.55) cluster.write(nextKey());
          refresh();
        }, 1100);
      } catch (err) {
        console.error("kepler-wasm failed to load", err);
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      if (tickTimer) clearInterval(tickTimer);
      ro.disconnect();
      clusterRef.current?.free();
      clusterRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  return <canvas ref={canvasRef} className="h-full w-full" />;
});
