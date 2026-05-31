/* tslint:disable */
/* eslint-disable */

export class Cluster {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Take down the current leader. Returns the killed node id, or -1.
     */
    kill_leader(): number;
    /**
     * Build an `n`-node cluster (ids `1..=n`) and warm it up until a leader
     * is elected, so the demo opens in a steady state.
     */
    constructor(n: number);
    /**
     * Bring a downed node back online (rejoins as a follower once it hears
     * the current leader).
     */
    revive(id: number): void;
    /**
     * Serialize the full cluster state to JSON for the renderer.
     */
    snapshot(): string;
    /**
     * Advance the cluster one logical tick (heartbeats, election timers),
     * then settle all in-flight messages.
     */
    tick(): void;
    /**
     * Propose a key on the current leader. Returns false if there's no leader.
     */
    write(key: string): boolean;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_cluster_free: (a: number, b: number) => void;
    readonly cluster_kill_leader: (a: number) => number;
    readonly cluster_new: (a: number) => number;
    readonly cluster_revive: (a: number, b: number) => void;
    readonly cluster_snapshot: (a: number) => [number, number];
    readonly cluster_tick: (a: number) => void;
    readonly cluster_write: (a: number, b: number, c: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
