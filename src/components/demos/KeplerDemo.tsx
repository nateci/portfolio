"use client";

import { useRef, useState } from "react";
import { RaftCluster, type RaftHandle } from "./RaftCluster";
import { LsmTree, type LsmHandle } from "./LsmTree";

type Tab = "consensus" | "storage";
type LogEntry = { term: number; key: string; committed: boolean };

export function KeplerDemo() {
  const [tab, setTab] = useState<Tab>("consensus");
  const [state, setState] = useState<{ term: number; leader: number; log: LogEntry[]; phase: string }>(
    { term: 1, leader: 0, log: [], phase: "stable" },
  );
  const raft = useRef<RaftHandle>(null);
  const lsm = useRef<LsmHandle>(null);

  const writeKey = () => {
    raft.current?.write();
    lsm.current?.write();
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* viz stage */}
      <div className="relative min-h-[300px] flex-1 overflow-hidden rounded-xl border border-line bg-[#0a0d12]">
        <div className="bg-dots pointer-events-none absolute inset-0 opacity-40" />

        {/* tabs */}
        <div className="absolute left-3 top-3 z-10 flex gap-1 rounded-lg border border-line bg-bg/70 p-1 backdrop-blur">
          {(["consensus", "storage"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1 font-mono text-[0.7rem] transition-colors ${
                tab === t ? "bg-accent text-bg" : "text-ink-dim hover:text-ink"
              }`}
            >
              {t === "consensus" ? "raft" : "lsm-tree"}
            </button>
          ))}
        </div>

        {/* both kept mounted so animation + refs persist */}
        <div className={tab === "consensus" ? "block h-[340px]" : "pointer-events-none absolute inset-0 opacity-0"}>
          <RaftCluster ref={raft} onState={setState} />
        </div>
        <div className={tab === "storage" ? "block h-[340px] p-4 pt-14" : "pointer-events-none absolute inset-0 opacity-0"}>
          <LsmTree ref={lsm} />
        </div>
      </div>

      {/* control + readout column */}
      <div className="flex w-full flex-col gap-3 lg:w-64">
        <div className="grid grid-cols-3 gap-2 font-mono text-xs">
          <Stat label="term" value={state.term} />
          <Stat label="leader" value={state.leader < 0 ? "n/a" : `n${state.leader}`} />
          <Stat
            label="state"
            value={state.phase === "stable" ? "ok" : "elect"}
            tone={state.phase === "stable" ? "green" : "amber"}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={writeKey}
            className="flex-1 rounded-lg bg-accent px-3 py-2 font-mono text-xs text-bg transition-transform hover:-translate-y-0.5"
          >
            write a key
          </button>
          <button
            onClick={() => raft.current?.killLeader()}
            className="flex-1 rounded-lg border border-red/40 bg-red/10 px-3 py-2 font-mono text-xs text-red transition-colors hover:bg-red/20"
          >
            kill leader
          </button>
        </div>

        {/* replicated log */}
        <div className="flex-1 rounded-lg border border-line bg-bg-elev p-2.5 font-mono text-[0.68rem]">
          <div className="eyebrow mb-1.5 text-[0.58rem]">replicated log</div>
          <div className="flex flex-col gap-1">
            {state.log.length === 0 && <span className="text-ink-faint">awaiting writes…</span>}
            {state.log.map((e, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-ink-dim">
                  <span className="text-ink-faint">t{e.term}</span> {e.key}
                </span>
                <span className={e.committed ? "text-green" : "text-amber"}>
                  {e.committed ? "committed" : "pending"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[0.68rem] leading-relaxed text-ink-faint">
          Real <span className="text-accent">kepler-raft</span> compiled to WebAssembly, running in
          your browser, not a simulation. <span className="text-ink-dim">Write a key</span>{" "}
          to append to the leader&apos;s log; <span className="text-ink-dim">kill the leader</span> to
          watch a
          genuine re-election.
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "green" | "amber";
}) {
  const color = tone === "green" ? "text-green" : tone === "amber" ? "text-amber" : "text-ink";
  return (
    <div className="rounded-lg border border-line bg-bg-elev px-2 py-1.5">
      <div className="eyebrow text-[0.55rem]">{label}</div>
      <div className={`tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
