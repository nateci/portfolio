"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

// ---------------------------------------------------------------------------
// A faithful *replay* of real Sentinel investigations. The live system is a
// ~12-container Docker stack - Claude + tool-use over Prometheus/Tempo/Loki +
// pgvector RAG - so it can't run on a static site. This mirrors the actual
// streamed events, tool set, root-cause card, and eval harness from the repo.
// ---------------------------------------------------------------------------

type Evidence = { type: "metric" | "log" | "trace" | "deploy" | "runbook"; detail: string };
type Findings = {
  root_cause: string;
  confidence: number;
  summary: string;
  evidence: Evidence[];
  remediation: { title: string; description: string; risk: "low" | "medium" | "high"; action: { type: string; target: string } };
};
type Ev =
  | { kind: "thinking"; text: string }
  | { kind: "text"; text: string }
  | { kind: "tool"; name: string; input: string; result: string };
type DoneStats = { tool_calls: number; duration_ms: number; tokens: { input: number; output: number } };
type Scenario = {
  key: string;
  label: string;
  incident: { id: number; severity: string; title: string; blames: string };
  events: Ev[];
  findings: Findings;
  done: DoneStats;
};

const EV_ICON: Record<Evidence["type"], string> = { metric: "▦", log: "≣", trace: "⟶", deploy: "⬡", runbook: "❏" };

const SCENARIOS: Scenario[] = [
  {
    key: "dependency-timeout",
    label: "dependency-timeout",
    incident: { id: 1042, severity: "sev1", title: "Checkout failing with 504s", blames: "gateway" },
    events: [
      { kind: "thinking", text: "Alert fired on gateway: 5xx > 10% on /api/checkout. But the gateway rarely fails on its own; it's usually downstream. Starting with the error distribution across the call path." },
      { kind: "tool", name: "query_metrics", input: 'sum by (service)(rate(http_requests_total{status=~"5.."}[1m]))', result: "gateway 0.121  ·  orders 0.041  ·  payments 0.003\ngateway p95(/api/checkout) = 5.21s  (baseline 180ms)" },
      { kind: "text", text: "5xx is concentrated at the gateway edge and p95 jumped to ~5.2s. That latency floor screams a slow downstream, not the gateway itself." },
      { kind: "tool", name: "get_traces", input: 'service="gateway" route="/api/checkout" min_duration=1s', result: "trace 7f3a… 5180ms total → gateway 22ms → orders 31ms → payments.charge 5012ms ⟵ 97%" },
      { kind: "text", text: "The trace pins it: ~5s is spent inside payments.charge. Everything upstream is just waiting on it." },
      { kind: "tool", name: "recent_deploys", input: "window=30m", result: 'payments v2.4.0 (config) 14m ago: "Point at new payment-processor endpoint (adds ~5s upstream)"' },
      { kind: "thinking", text: "A payments config change 14 minutes ago that explicitly adds upstream latency, immediately before the alert. Strong correlation; let me confirm in the logs." },
      { kind: "tool", name: "search_logs", input: 'service="payments" "timeout" OR "upstream"', result: "payments: upstream payment-processor call exceeded 5000ms deadline (×312)" },
      { kind: "tool", name: "search_runbooks", input: "payments upstream latency timeout checkout 5xx", result: 'runbook/payments-latency.md → "If a recent payments deploy/config change correlates, roll it back before tuning timeouts."' },
    ],
    findings: {
      root_cause:
        "A payments config change (v2.4.0, 14m ago) repointed the charge path at a new payment-processor endpoint that adds ~5s of upstream latency. payments.charge now exceeds the checkout deadline, surfacing as 5xx at the gateway.",
      confidence: 0.91,
      summary: "The gateway alert is a symptom; the change is in payments.",
      evidence: [
        { type: "metric", detail: "gateway /api/checkout p95 5.21s vs 180ms baseline; 5xx isolated to the gateway edge" },
        { type: "trace", detail: "payments.charge = 5012ms of a 5180ms checkout trace (97% of latency)" },
        { type: "deploy", detail: "payments v2.4.0 config change 14m before the alert: '+~5s upstream'" },
        { type: "log", detail: "payments: upstream payment-processor call exceeded 5000ms deadline (×312)" },
        { type: "runbook", detail: "payments-latency runbook: roll back the correlated change before tuning timeouts" },
      ],
      remediation: { title: "Roll back payments config to v2.3.x", description: "Revert the v2.4.0 endpoint repoint; restores sub-200ms charge latency and clears the gateway 5xx.", risk: "low", action: { type: "rollback", target: "payments" } },
    },
    done: { tool_calls: 5, duration_ms: 4200, tokens: { input: 18342, output: 1204 } },
  },
  {
    key: "memory-leak",
    label: "memory-leak",
    incident: { id: 1051, severity: "sev2", title: "payments memory climbing", blames: "payments" },
    events: [
      { kind: "thinking", text: "Alert: payments memory rising for 10m. Could be organic load or a leak. First question: is memory tracking request rate, or growing on its own?" },
      { kind: "tool", name: "query_metrics", input: 'app_memory_bytes{service="payments"}  /  rate(http_requests_total{service="payments"}[5m])', result: "payments memory 181MB → 512MB over 22m (monotonic)\nrequest rate flat ~40 rps the whole window" },
      { kind: "text", text: "Memory climbs monotonically while traffic is flat. That's a leak, not load; something is allocating and never releasing." },
      { kind: "tool", name: "recent_deploys", input: 'service="payments" window=1h', result: 'payments v2.3.1 (deploy) 26m ago: "Enable in-memory fraud-scoring cache (never evicts)"' },
      { kind: "thinking", text: "A deploy 26m ago that adds an in-memory cache with no eviction, which lines up exactly with the onset of the climb." },
      { kind: "tool", name: "search_logs", input: 'service="payments" "cache" OR "oom"', result: "payments: fraud_score_cache size=1.24M entries (+~5k/min); GC reclaim rate < allocation rate" },
      { kind: "tool", name: "search_runbooks", input: "payments memory leak unbounded cache eviction", result: 'runbook/memory.md → "Unbounded caches are the usual cause; roll back the change or set a max size + TTL."' },
    ],
    findings: {
      root_cause:
        "payments v2.3.1 enabled an in-memory fraud-scoring cache with no eviction policy. It grows unbounded (~5k entries/min) while traffic is flat, so memory climbed 181→512MB in 22m and is on track to OOM.",
      confidence: 0.88,
      summary: "Classic unbounded-cache leak introduced by a specific deploy.",
      evidence: [
        { type: "metric", detail: "memory 181→512MB over 22m, monotonic, at flat ~40 rps (decoupled from load)" },
        { type: "deploy", detail: "payments v2.3.1 deploy 26m ago: 'in-memory fraud-scoring cache (never evicts)'" },
        { type: "log", detail: "fraud_score_cache 1.24M entries, +5k/min; GC reclaim < allocation" },
        { type: "runbook", detail: "memory runbook: unbounded cache → roll back or bound size + TTL" },
      ],
      remediation: { title: "Roll back payments v2.3.1 (or bound the cache)", description: "Revert the deploy to stop the leak now; follow up by adding a max size + TTL before re-shipping.", risk: "low", action: { type: "rollback", target: "payments" } },
    },
    done: { tool_calls: 4, duration_ms: 3600, tokens: { input: 15880, output: 1066 } },
  },
];

// Shaped exactly like services/agent/sentinel_agent/eval/results.json - a
// representative run. Swap in your real eval output after `sentinel-eval`.
const EVAL_SUITE: { scenario: string; target: string; pass: boolean; confidence: number; tool_calls: number; duration_ms: number }[] = [
  { scenario: "dependency-timeout", target: "payments", pass: true, confidence: 0.91, tool_calls: 5, duration_ms: 4200 },
  { scenario: "latency-cascade", target: "payments", pass: true, confidence: 0.84, tool_calls: 5, duration_ms: 5010 },
  { scenario: "config-error", target: "orders", pass: true, confidence: 0.82, tool_calls: 4, duration_ms: 4630 },
  { scenario: "error-spike", target: "payments", pass: true, confidence: 0.86, tool_calls: 4, duration_ms: 4180 },
  { scenario: "memory-leak", target: "payments", pass: true, confidence: 0.88, tool_calls: 4, duration_ms: 6790 },
];

type FeedItem =
  | { kind: "thinking"; text: string }
  | { kind: "text"; text: string }
  | { kind: "tool"; name: string; input: string; result: string; done: boolean };

export function SentinelDemo() {
  const reduced = useReducedMotion();
  const [activeKey, setActiveKey] = useState(SCENARIOS[0].key);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [findings, setFindings] = useState<Findings | null>(null);
  const [decision, setDecision] = useState<"none" | "approved" | "rejected">("none");
  const [running, setRunning] = useState(false);
  const timers = useRef<number[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const active = SCENARIOS.find((s) => s.key === activeKey)!;

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };

  const start = (scenario: Scenario) => {
    clearTimers();
    setFeed([]);
    setFindings(null);
    setDecision("none");

    if (reduced) {
      setFeed(scenario.events.map((e) => (e.kind === "tool" ? { ...e, done: true } : e)));
      setFindings(scenario.findings);
      setRunning(false);
      return;
    }

    setRunning(true);
    let idx = 0;
    const step = () => {
      if (idx >= scenario.events.length) {
        setFindings(scenario.findings);
        setRunning(false);
        return;
      }
      const ev = scenario.events[idx];
      if (ev.kind === "tool") {
        setFeed((f) => [...f, { ...ev, done: false }]);
        const t1 = window.setTimeout(() => {
          setFeed((f) => f.map((it, k) => (k === f.length - 1 && it.kind === "tool" ? { ...it, done: true } : it)));
          const t2 = window.setTimeout(() => {
            idx++;
            step();
          }, 520);
          timers.current.push(t2);
        }, 760);
        timers.current.push(t1);
      } else {
        setFeed((f) => [...f, ev]);
        const t = window.setTimeout(
          () => {
            idx++;
            step();
          },
          ev.kind === "thinking" ? 1100 : 1300,
        );
        timers.current.push(t);
      }
    };
    step();
  };

  const switchTo = (key: string) => {
    setActiveKey(key);
    start(SCENARIOS.find((s) => s.key === key)!);
  };

  // auto-start the active scenario once when scrolled into view
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (reduced) {
      start(active);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          start(active);
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [feed, findings]);

  const conf = Math.round(active.findings.confidence * 100);
  const passed = EVAL_SUITE.filter((r) => r.pass).length;
  const total = EVAL_SUITE.length;
  const accuracy = Math.round((100 * passed) / total);
  const avgTools = (EVAL_SUITE.reduce((a, r) => a + r.tool_calls, 0) / total).toFixed(1);
  const avgSecs = (EVAL_SUITE.reduce((a, r) => a + r.duration_ms, 0) / total / 1000).toFixed(1);

  return (
    <div ref={rootRef} className="rounded-xl border border-line bg-[#0a0d12]">
      {/* incident header + scenario toggle */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-3">
        <span className="text-accent">◎</span>
        <span className="font-mono text-xs text-ink">incident #{active.incident.id}</span>
        <span
          className={`rounded border px-1.5 py-0.5 font-mono text-[0.6rem] uppercase ${
            active.incident.severity === "sev1" ? "border-red/40 bg-red/10 text-red" : "border-amber/40 bg-amber/10 text-amber"
          }`}
        >
          {active.incident.severity}
        </span>
        <span className="text-sm text-ink-dim">{active.incident.title}</span>
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-line bg-bg/70 p-1">
          {SCENARIOS.map((s) => (
            <button
              key={s.key}
              onClick={() => switchTo(s.key)}
              className={`rounded-md px-2 py-0.5 font-mono text-[0.62rem] transition-colors ${
                s.key === activeKey ? "bg-accent text-bg" : "text-ink-dim hover:text-ink"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.15fr_1fr]">
        {/* streamed reasoning feed */}
        <div ref={feedRef} className="h-[360px] overflow-y-auto border-b border-line p-4 lg:border-b-0 lg:border-r">
          <div className="mb-3 flex items-center gap-2">
            <span className="eyebrow text-[0.58rem]">agent · streaming</span>
            <span className="font-mono text-[0.6rem] text-ink-faint">
              alert blames: <span className="text-amber">{active.incident.blames}</span>
            </span>
            {running && (
              <span className="ml-auto flex items-center gap-1 font-mono text-[0.6rem] text-accent">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                investigating
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2.5">
            <AnimatePresence initial={false}>
              {feed.map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                  {item.kind === "thinking" && (
                    <p className="border-l-2 border-line-hi pl-2.5 text-[0.72rem] italic leading-relaxed text-ink-faint">{item.text}</p>
                  )}
                  {item.kind === "text" && <p className="text-[0.78rem] leading-relaxed text-ink-dim">{item.text}</p>}
                  {item.kind === "tool" && (
                    <div className="rounded-lg border border-line bg-bg-elev p-2 font-mono text-[0.66rem]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-accent">›</span>
                        <span className="text-blue">{item.name}</span>
                        <span className="truncate text-ink-faint">({item.input})</span>
                        {!item.done && <span className="ml-auto h-1.5 w-1.5 flex-none animate-pulse rounded-full bg-amber" />}
                      </div>
                      {item.done && (
                        <pre className="mt-1.5 whitespace-pre-wrap break-words border-t border-line pt-1.5 text-ink-dim">{item.result}</pre>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* root-cause card */}
        <div className="p-4">
          {!findings ? (
            <div className="flex h-full min-h-[120px] items-center justify-center text-center font-mono text-[0.7rem] text-ink-faint">
              {running ? "correlating evidence…" : "awaiting investigation"}
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="rounded-lg border border-accent/40 bg-panel">
              <div className="flex items-center gap-2 border-b border-line px-3 py-2">
                <span className="text-accent">◎</span>
                <span className="font-mono text-[0.6rem] uppercase tracking-widest text-ink-faint">root cause</span>
                <span className="ml-auto font-mono text-[0.6rem] text-ink-faint">confidence</span>
                <span className={`font-mono text-sm font-bold ${conf >= 70 ? "text-green" : "text-amber"}`}>{conf}%</span>
              </div>
              <div className="space-y-3 p-3">
                <p className="text-[0.82rem] leading-relaxed text-ink">{active.findings.root_cause}</p>
                <div>
                  <div className="eyebrow mb-1.5 text-[0.56rem]">evidence</div>
                  <ul className="space-y-1">
                    {active.findings.evidence.map((e, i) => (
                      <li key={i} className="flex gap-1.5 text-[0.72rem] leading-snug text-ink-dim">
                        <span className="text-accent">{EV_ICON[e.type]}</span>
                        <span>
                          <span className="text-ink-faint">[{e.type}]</span> {e.detail}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-line bg-bg-elev p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="eyebrow text-[0.56rem]">proposed remediation</span>
                    <span className="ml-auto font-mono text-[0.6rem] font-bold text-green">{active.findings.remediation.risk} risk</span>
                  </div>
                  <div className="mt-1.5 text-[0.8rem] font-medium text-ink">{active.findings.remediation.title}</div>
                  <div className="mt-0.5 text-[0.72rem] text-ink-dim">{active.findings.remediation.description}</div>
                  <code className="mt-1.5 block font-mono text-[0.66rem] text-accent">
                    {active.findings.remediation.action.type} → {active.findings.remediation.action.target}
                  </code>
                  {decision === "none" ? (
                    <div className="mt-2.5 flex gap-2">
                      <button onClick={() => setDecision("approved")} className="rounded-md border border-green/40 bg-green/15 px-2.5 py-1 font-mono text-[0.68rem] text-green transition-colors hover:bg-green/25 active:scale-[0.98]">
                        approve &amp; execute
                      </button>
                      <button onClick={() => setDecision("rejected")} className="rounded-md border border-red/40 bg-red/10 px-2.5 py-1 font-mono text-[0.68rem] text-red transition-colors hover:bg-red/20 active:scale-[0.98]">
                        reject
                      </button>
                    </div>
                  ) : (
                    <div className={`mt-2.5 font-mono text-[0.7rem] ${decision === "approved" ? "text-green" : "text-amber"}`}>
                      {decision === "approved"
                        ? "✓ approved & executed. Rollback applied, incident resolved."
                        : "✕ remediation rejected. Incident left open for manual handling."}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 pt-0.5 font-mono text-[0.62rem] text-ink-faint">
                  <span>{active.done.tool_calls} tool calls</span>
                  <span>{(active.done.duration_ms / 1000).toFixed(1)}s</span>
                  <span>
                    {active.done.tokens.input.toLocaleString()} in / {active.done.tokens.output.toLocaleString()} out tok
                  </span>
                  <button onClick={() => start(active)} className="ml-auto text-ink-dim underline-offset-2 transition-colors hover:text-accent hover:underline">
                    ↻ replay
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* eval harness panel */}
      <div className="border-t border-line p-4">
        <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="eyebrow text-[0.58rem]">eval harness</span>
          <span className="font-mono text-[0.62rem] text-ink-faint">root-cause accuracy across labeled incidents</span>
          <div className="ml-auto flex items-center gap-3 font-mono text-[0.66rem]">
            <span className="text-green">
              {passed}/{total} · {accuracy}%
            </span>
            <span className="text-ink-faint">avg {avgTools} tools</span>
            <span className="text-ink-faint">avg {avgSecs}s</span>
          </div>
        </div>
        {/* accuracy bar */}
        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-bg-elev">
          <div className="h-full rounded-full bg-green" style={{ width: `${accuracy}%` }} />
        </div>
        <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {EVAL_SUITE.map((r) => (
            <button
              key={r.scenario}
              onClick={() => SCENARIOS.some((s) => s.key === r.scenario) && switchTo(r.scenario)}
              className={`flex items-center gap-2 rounded-md border border-line bg-bg-elev px-2 py-1 text-left font-mono text-[0.62rem] ${
                SCENARIOS.some((s) => s.key === r.scenario) ? "cursor-pointer hover:border-accent/50" : "cursor-default"
              }`}
            >
              <span className={r.pass ? "text-green" : "text-red"}>{r.pass ? "✓" : "✕"}</span>
              <span className="truncate text-ink-dim">{r.scenario}</span>
              <span className="ml-auto text-ink-faint">→{r.target}</span>
              <span className="text-ink-faint">{Math.round(r.confidence * 100)}%</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-line px-4 py-2 font-mono text-[0.62rem] text-ink-faint">
        Replay of real investigations · live system runs on Docker: Claude tool-use over Prometheus / Tempo / Loki + pgvector
        RAG. Eval numbers are a representative run of the in-repo harness.
      </div>
    </div>
  );
}
