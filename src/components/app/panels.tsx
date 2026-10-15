"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight, Mail } from "lucide-react";
import { education, experience, profile, projects, skills, type Project } from "@/lib/content";
import { flyTo } from "../scene/bus";
import { KeplerDemo } from "../demos/KeplerDemo";
import { SentinelDemo } from "../demos/SentinelDemo";
import { SonarDemo } from "../demos/SonarDemo";
import { GithubIcon, LinkedinIcon } from "../icons";
import { go, href } from "./route";

// Tailwind needs literal class names, so accents map to full strings.
const ACCENT: Record<Project["accent"], { text: string; dot: string; chip: string; tile: string }> = {
  accent: {
    text: "text-accent",
    dot: "bg-accent shadow-[0_0_10px_var(--color-accent)]",
    chip: "border-accent/40 bg-accent/10 text-accent",
    tile: "border-accent/25 bg-accent/5",
  },
  red: {
    text: "text-red",
    dot: "bg-red shadow-[0_0_10px_var(--color-red)]",
    chip: "border-red/40 bg-red/10 text-red",
    tile: "border-red/25 bg-red/5",
  },
  amber: {
    text: "text-amber",
    dot: "bg-amber shadow-[0_0_10px_var(--color-amber)]",
    chip: "border-amber/40 bg-amber/10 text-amber",
    tile: "border-amber/25 bg-amber/5",
  },
  blue: {
    text: "text-blue",
    dot: "bg-blue shadow-[0_0_10px_var(--color-blue)]",
    chip: "border-blue/40 bg-blue/10 text-blue",
    tile: "border-blue/25 bg-blue/5",
  },
};

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md border border-line bg-bg-elev px-2.5 py-1 font-mono text-[0.68rem] text-ink-dim">
      {children}
    </span>
  );
}

function Eyebrow({ index, label }: { index: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-xs text-accent">
        {index} / {label}
      </span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

/**
 * Side panel (desktop) / bottom sheet (phone). Scrolls internally so the 3D
 * subject stays framed beside it. Focus moves to the heading on mount so
 * keyboard and screen-reader users land on the new view.
 */
export function Panel({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("h1, h2")?.focus({ preventScroll: true });
    ref.current?.scrollTo({ top: 0 });
  }, []);
  return (
    <div
      ref={ref}
      className={`reading-panel fixed inset-x-2 bottom-[4.5rem] top-[38vh] overflow-y-auto overscroll-contain p-5 md:inset-x-auto md:bottom-4 md:left-4 md:top-[8.5rem] md:p-8 lg:top-[4.5rem] ${
        wide ? "md:w-[min(54rem,calc(100vw-2rem))] lg:w-[min(54rem,60vw)]" : "md:w-[min(44rem,calc(100vw-2rem))] lg:w-[min(44rem,52vw)]"
      }`}
    >
      {children}
    </div>
  );
}

const headingCls = "mt-4 text-3xl font-semibold tracking-tight text-grad outline-none md:text-4xl";

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export function ProjectsOverview() {
  useEffect(() => flyTo("projects"), []);
  return (
    <div className="fixed inset-x-0 bottom-[4.5rem] top-[42vh] overflow-y-auto px-3 md:bottom-6 md:top-auto md:overflow-visible md:px-5">
      <div className="mx-auto max-w-7xl">
        <div className="mb-3 hidden md:block">
          <Eyebrow index="01" label="projects" />
        </div>
        <h2 tabIndex={-1} className="sr-only">
          Projects
        </h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {projects.map((p, i) => {
            const a = ACCENT[p.accent];
            return (
              <a
                key={p.id}
                href={href("projects", p.id)}
                className="reading-panel group flex flex-col p-5 transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-line-hi"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[0.65rem] text-ink-faint">0{i + 1}</span>
                  <span className={`h-2 w-2 rounded-full ${a.dot}`} />
                </div>
                <h3 className="mt-3 text-lg font-semibold text-ink">{p.name}</h3>
                <div className={`font-mono text-[0.62rem] uppercase tracking-wider ${a.text}`}>{p.status}</div>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-dim">{p.blurb}</p>
                <div className="mt-4 flex items-end justify-between gap-3 pt-1">
                  <div>
                    <div className={`font-mono text-lg ${a.text}`}>{p.metrics[0].value}</div>
                    <div className="text-[0.68rem] text-ink-faint">{p.metrics[0].label}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-ink-dim transition-colors group-hover:text-ink">
                    Open <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Demo({ kind }: { kind: Project["demo"] }) {
  if (kind === "kepler") return <KeplerDemo />;
  if (kind === "sentinel") return <SentinelDemo />;
  if (kind === "sonar") return <SonarDemo />;
  return null;
}

export function ProjectDetail({ id }: { id: string }) {
  const idx = Math.max(0, projects.findIndex((p) => p.id === id));
  const p = projects[idx];
  const a = ACCENT[p.accent];
  const prev = projects[(idx - 1 + projects.length) % projects.length];
  const next = projects[(idx + 1) % projects.length];
  // Kepler has two scenes: the consensus orbit and the storage engine
  const [view, setView] = useState<"consensus" | "storage">("consensus");

  useEffect(() => {
    flyTo(p.id === "kepler" && view === "storage" ? "lsm" : (p.id as "kepler" | "sentinel" | "argus" | "sonar"));
  }, [p.id, view]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowRight") go("projects", next.id);
      else if (e.key === "ArrowLeft") go("projects", prev.id);
      else if (e.key === "Escape") go("projects");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next.id, prev.id]);

  return (
    <Panel wide>
      <div className="flex items-center justify-between gap-3">
        <a href={href("projects")} className="inline-flex items-center gap-1.5 text-sm text-ink-dim transition-colors hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> All projects
        </a>
        <div className="flex items-center gap-1">
          <span className="mr-2 font-mono text-xs text-ink-faint">
            0{idx + 1} / 0{projects.length}
          </span>
          <a href={href("projects", prev.id)} aria-label={`Previous: ${prev.name}`} className="rounded-md border border-line p-1.5 text-ink-dim transition-colors hover:border-line-hi hover:text-ink">
            <ChevronLeft className="h-4 w-4" />
          </a>
          <a href={href("projects", next.id)} aria-label={`Next: ${next.name}`} className="rounded-md border border-line p-1.5 text-ink-dim transition-colors hover:border-line-hi hover:text-ink">
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${a.dot}`} />
        <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[0.62rem] uppercase tracking-wider ${a.chip}`}>{p.status}</span>
        <span className="font-mono text-xs text-ink-faint">{p.period}</span>
      </div>
      <h2 tabIndex={-1} className={headingCls}>
        {p.name}
      </h2>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink-dim">{p.blurb}</p>

      <div className={`mt-6 grid gap-3 ${p.metrics.length > 2 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {p.metrics.map((m) => (
          <div key={m.label} className={`rounded-xl border p-4 ${a.tile}`}>
            <div className={`font-mono text-2xl tabular-nums ${a.text}`}>{m.value}</div>
            <div className="mt-1 text-xs text-ink-dim">{m.label}</div>
          </div>
        ))}
      </div>

      {p.id === "kepler" && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="eyebrow">camera</span>
          {(["consensus", "storage"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`rounded-md px-3 py-1 font-mono text-[0.7rem] transition-colors ${
                view === v ? "bg-accent text-bg" : "border border-line text-ink-dim hover:text-ink"
              }`}
            >
              {v === "consensus" ? "raft cluster" : "lsm-tree"}
            </button>
          ))}
        </div>
      )}

      {p.demo && (
        <section className="mt-8">
          <h3 className="eyebrow mb-3">Live demo · runs in your browser</h3>
          <Demo kind={p.demo} />
        </section>
      )}

      <section className="mt-8">
        <h3 className="eyebrow mb-3">What I built</h3>
        <ul className="flex flex-col gap-3">
          {p.highlights.map((h, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink-dim">
              <span className={`mt-2 inline-block h-1.5 w-1.5 flex-none rounded-full ${a.dot}`} />
              {h}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h3 className="eyebrow mb-3">Stack</h3>
        <div className="flex flex-wrap gap-1.5">
          {p.stack.map((s) => (
            <Chip key={s}>{s}</Chip>
          ))}
        </div>
      </section>

      <div className="mt-10 grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
        <a href={href("projects", prev.id)} className="rounded-xl border border-line p-4 transition-colors hover:border-line-hi">
          <div className="font-mono text-[0.65rem] text-ink-faint">← previous</div>
          <div className="mt-1 text-ink">{prev.name}</div>
        </a>
        <a href={href("projects", next.id)} className="rounded-xl border border-line p-4 text-right transition-colors hover:border-line-hi">
          <div className="font-mono text-[0.65rem] text-ink-faint">next →</div>
          <div className="mt-1 text-ink">{next.name}</div>
        </a>
      </div>
      <p className="mt-4 hidden text-center font-mono text-[0.65rem] text-ink-faint md:block">← → to switch projects · esc for all</p>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Experience
// ---------------------------------------------------------------------------

export function ExperiencePanel({ id }: { id?: string }) {
  const found = experience.findIndex((e) => e.id === id);
  const idx = found >= 0 ? found : 0;
  const e = experience[idx];

  useEffect(() => flyTo(`experience:${idx}`), [idx]);

  useEffect(() => {
    // mirrors the constellation: older roles sit to the left (list is newest-first)
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "ArrowLeft") go("experience", experience[Math.min(idx + 1, experience.length - 1)].id);
      else if (ev.key === "ArrowRight") go("experience", experience[Math.max(idx - 1, 0)].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx]);

  const badge = (x: (typeof experience)[number]) =>
    x.incoming ? (
      <span className="font-mono text-[0.6rem] uppercase tracking-wider text-amber">● incoming</span>
    ) : x.current ? (
      <span className="font-mono text-[0.6rem] uppercase tracking-wider text-green">● current</span>
    ) : null;

  return (
    <Panel wide>
      <Eyebrow index="02" label="experience" />
      <h2 tabIndex={-1} className={headingCls}>
        Where I&apos;ve shipped
      </h2>

      <div className="mt-6 grid gap-6 md:grid-cols-[13rem_1fr]">
        <ol className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-col md:overflow-visible md:px-0">
          {experience.map((x, i) => (
            <li key={x.id} className="flex-none">
              <a
                href={href("experience", x.id)}
                aria-current={i === idx ? "true" : undefined}
                className={`block rounded-lg border px-3 py-2.5 transition-colors ${
                  i === idx ? "border-line-hi bg-panel-hi" : "border-transparent hover:border-line"
                }`}
              >
                <div className="text-sm text-ink">{x.company}</div>
                <div className="font-mono text-[0.62rem] text-ink-faint">{x.period}</div>
              </a>
            </li>
          ))}
        </ol>

        <div key={e.id}>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-xl font-semibold text-ink">{e.company}</h3>
            <span className="text-sm text-accent">{e.role}</span>
            {badge(e)}
          </div>
          <div className="mt-1 font-mono text-xs text-ink-faint">
            {e.period} · {e.location}
          </div>
          <ul className="mt-4 flex flex-col gap-3">
            {e.points.map((pt, j) => (
              <li key={j} className="flex gap-3 text-sm leading-relaxed text-ink-dim">
                <span className="mt-2 inline-block h-1 w-1 flex-none rounded-full bg-line-hi" />
                {pt}
              </li>
            ))}
          </ul>
          <p className="mt-6 hidden font-mono text-[0.65rem] text-ink-faint md:block">← → to move through the timeline</p>
        </div>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Stack + contact
// ---------------------------------------------------------------------------

export function StackPanel() {
  useEffect(() => flyTo("stack"), []);
  return (
    <Panel>
      <Eyebrow index="03" label="stack" />
      <h2 tabIndex={-1} className={headingCls}>
        Tools &amp; Frameworks
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {skills.map((g) => (
          <div key={g.group} className="panel p-4">
            <div className="eyebrow mb-3">{g.group}</div>
            <div className="flex flex-wrap gap-1.5">
              {g.items.map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="panel mt-4 p-4">
        <div className="text-lg font-semibold text-ink">{education.school}</div>
        <div className="text-sm text-ink-dim">{education.degree}</div>
        <div className="mt-1 font-mono text-xs text-ink-faint">
          {education.detail} · {education.period}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {education.honors.map((h) => (
            <span key={h} className="rounded-md border border-amber/30 bg-amber/10 px-2.5 py-1 font-mono text-[0.68rem] text-amber">
              {h}
            </span>
          ))}
        </div>
      </div>
    </Panel>
  );
}

export function ContactPanel() {
  useEffect(() => flyTo("contact"), []);
  const btn =
    "inline-flex items-center gap-2 rounded-lg border border-line-hi bg-panel px-5 py-2.5 text-sm text-ink transition-colors hover:border-accent hover:text-accent active:scale-[0.98]";
  return (
    <Panel>
      <Eyebrow index="04" label="contact" />
      <h2 tabIndex={-1} className={headingCls}>
        Building something hard? Let&apos;s talk.
      </h2>
      <p className="mt-2 max-w-xl text-ink-dim">Fastest way to reach me is email.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={`mailto:${profile.email}`}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-bg transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <Mail className="h-4 w-4" />
          {profile.email}
        </a>
        <a href={profile.links.github} target="_blank" rel="noreferrer" className={btn}>
          <GithubIcon className="h-4 w-4" />
          GitHub
        </a>
        <a href={profile.links.linkedin} target="_blank" rel="noreferrer" className={btn}>
          <LinkedinIcon className="h-4 w-4" />
          LinkedIn
        </a>
      </div>
      <p className="mt-10 font-mono text-xs text-ink-faint">
        {profile.available} · {profile.location}
      </p>
    </Panel>
  );
}
