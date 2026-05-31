"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

// ---------------------------------------------------------------------------
// LSM-tree storage engine: writes land in the memtable (+ WAL), the memtable
// flushes to an L0 SSTable when full, and overlapping SSTables compact down
// the levels. Self-running, with a write() handle.
// ---------------------------------------------------------------------------

const MEMTABLE_CAP = 8;
const FANOUT = 3; // sstables per level before compaction

let uid = 0;
type SSTable = { id: number; lo: number; hi: number; size: number };

const fmtKey = (n: number) => `k${n.toString().padStart(4, "0")}`;

export type LsmHandle = { write: () => void };

export const LsmTree = forwardRef<LsmHandle, object>(function LsmTree(_props, ref) {
  const [memtable, setMemtable] = useState<number[]>([]);
  const [levels, setLevels] = useState<SSTable[][]>([[], [], []]);
  const [wal, setWal] = useState(0);
  const [flushFlash, setFlushFlash] = useState(false);
  const keyCounter = useRef(0);

  const compact = (lvls: SSTable[][]): SSTable[][] => {
    const next = lvls.map((l) => [...l]);
    for (let i = 0; i < next.length - 1; i++) {
      if (next[i].length >= FANOUT) {
        const merged = next[i];
        next[i] = [];
        const lo = Math.min(...merged.map((s) => s.lo));
        const hi = Math.max(...merged.map((s) => s.hi));
        const size = merged.reduce((a, s) => a + s.size, 0);
        next[i + 1] = [...next[i + 1], { id: uid++, lo, hi, size }];
      }
    }
    return next;
  };

  const write = () => {
    const k = keyCounter.current++;
    setWal((w) => w + 1);
    setMemtable((mt) => {
      const nextMt = [...mt, k].sort((a, b) => a - b);
      if (nextMt.length >= MEMTABLE_CAP) {
        // flush to L0
        const lo = Math.min(...nextMt);
        const hi = Math.max(...nextMt);
        setFlushFlash(true);
        setTimeout(() => setFlushFlash(false), 450);
        setLevels((lv) => {
          const withL0 = [
            [...lv[0], { id: uid++, lo, hi, size: nextMt.length }],
            lv[1],
            lv[2],
          ];
          return compact(withL0);
        });
        return [];
      }
      return nextMt;
    });
  };

  useImperativeHandle(ref, () => ({ write }));

  const reduced = useReducedMotion();

  // self-run - but if the user prefers reduced motion, just seed a
  // representative static snapshot instead of continuously animating.
  useEffect(() => {
    if (reduced) {
      for (let i = 0; i < 14; i++) write();
      return;
    }
    const id = setInterval(write, 1300);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  const levelMeta = [
    { name: "L0", hint: "flushed, may overlap", color: "#35d6c3" },
    { name: "L1", hint: "10× larger", color: "#4aa3ff" },
    { name: "L2", hint: "100× larger", color: "#a78bfa" },
  ];

  return (
    <div className="flex h-full flex-col gap-3 p-1 font-mono text-xs">
      {/* WAL + memtable */}
      <div className="grid grid-cols-[auto_1fr] items-center gap-3">
        <div className="flex flex-col items-center">
          <span className="eyebrow text-[0.6rem]">wal</span>
          <span className="tabular-nums text-amber">{wal}</span>
        </div>
        <div
          className={`relative rounded-lg border p-2 transition-colors ${
            flushFlash ? "border-accent bg-accent/10" : "border-line bg-bg-elev"
          }`}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <span className="eyebrow text-[0.6rem]">memtable · sorted</span>
            <span className="text-ink-faint">
              {memtable.length}/{MEMTABLE_CAP}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            <AnimatePresence mode="popLayout">
              {memtable.map((k) => (
                <motion.span
                  key={k}
                  layout
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, y: 14, scale: 0.6 }}
                  transition={{ duration: 0.25 }}
                  className="rounded bg-accent/15 px-1.5 py-0.5 text-[0.65rem] text-accent"
                >
                  {fmtKey(k)}
                </motion.span>
              ))}
            </AnimatePresence>
            {memtable.length === 0 && (
              <span className="py-0.5 text-ink-faint">flushed</span>
            )}
          </div>
        </div>
      </div>

      {/* levels */}
      <div className="flex flex-1 flex-col justify-center gap-2.5">
        {levels.map((lvl, i) => (
          <div key={i} className="grid grid-cols-[auto_1fr] items-center gap-3">
            <div className="flex w-14 flex-col">
              <span className="font-semibold" style={{ color: levelMeta[i].color }}>
                {levelMeta[i].name}
              </span>
              <span className="text-[0.58rem] leading-tight text-ink-faint">
                {levelMeta[i].hint}
              </span>
            </div>
            <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-line bg-bg-elev p-1.5">
              <AnimatePresence mode="popLayout">
                {lvl.map((s) => (
                  <motion.div
                    key={s.id}
                    layout
                    initial={{ opacity: 0, y: -10, scale: 0.7 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ type: "spring", stiffness: 260, damping: 22 }}
                    className="flex items-center gap-1 rounded border px-2 py-1"
                    style={{
                      borderColor: `${levelMeta[i].color}55`,
                      background: `${levelMeta[i].color}12`,
                    }}
                  >
                    <span style={{ color: levelMeta[i].color }}>▦</span>
                    <span className="text-[0.6rem] text-ink-dim">
                      [{fmtKey(s.lo)}–{fmtKey(s.hi)}]
                    </span>
                    <span className="text-[0.55rem] text-ink-faint">{s.size}kv</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {lvl.length === 0 && <span className="px-1 text-ink-faint">empty</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
