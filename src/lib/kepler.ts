// Loads the kepler-wasm module (the real Rust Raft cluster compiled to WASM)
// and hands back a Cluster instance. init() is memoized so the wasm is only
// fetched/instantiated once per page.

import init, { Cluster } from "@/wasm/kepler_wasm";

let initPromise: Promise<unknown> | null = null;

export async function loadCluster(n: number): Promise<Cluster> {
  if (!initPromise) {
    initPromise = init({ module_or_path: "/kepler_wasm_bg.wasm" });
  }
  await initPromise;
  return new Cluster(n);
}

export type KeplerSnapshot = {
  term: number;
  leader: number; // node id, or -1 when leaderless
  nodes: { id: number; role: string; term: number; commit: number; alive: boolean }[];
  log: { index: number; term: number; key: string; committed: boolean }[];
  pulses: { from: number; to: number; kind: string }[];
};
