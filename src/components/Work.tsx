"use client";

import { projects, type Project } from "@/lib/content";
import { Reveal, SectionHeader } from "./Reveal";
import { KeplerDemo } from "./demos/KeplerDemo";
import { SentinelDemo } from "./demos/SentinelDemo";
import { SonarDemo } from "./demos/SonarDemo";

function Demo({ kind }: { kind: Project["demo"] }) {
  if (kind === "kepler") return <KeplerDemo />;
  if (kind === "sentinel") return <SentinelDemo />;
  if (kind === "sonar") return <SonarDemo />;
  return null;
}

function Card({ project, index }: { project: Project; index: number }) {
  return (
    <Reveal delay={index * 0.05}>
      <article className="panel panel-glow overflow-hidden p-5 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-line-hi hover:shadow-[0_0_50px_-12px_rgba(53,214,195,0.22)] md:p-7">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-semibold tracking-tight text-ink">{project.name}</h3>
              {project.status && (
                <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 font-mono text-[0.62rem] uppercase tracking-wider text-accent">
                  {project.status}
                </span>
              )}
            </div>
            <p className="mt-2 max-w-2xl text-ink-dim">{project.blurb}</p>
          </div>
          <span className="font-mono text-xs text-ink-faint">{project.period}</span>
        </div>

        <Demo kind={project.demo} />

        <div className="mt-6 grid gap-6 md:grid-cols-[1.4fr_1fr]">
          <ul className="flex flex-col gap-2.5">
            {project.highlights.map((h, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-dim">
                <span className="mt-2 inline-block h-1 w-1 flex-none rounded-full bg-accent" />
                {h}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap content-start gap-1.5">
            {project.stack.map((s) => (
              <span
                key={s}
                className="rounded-md border border-line bg-bg-elev px-2.5 py-1 font-mono text-[0.68rem] text-ink-dim"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </article>
    </Reveal>
  );
}

export function Work() {
  return (
    <section id="work" className="mx-auto max-w-6xl px-5 py-24">
      <SectionHeader
        index="01 / work"
        title="Selected work"
        sub="Each panel below is live: running in your browser, no backend. Poke at them."
      />
      <div className="flex flex-col gap-8">
        {projects.map((p, i) => (
          <Card key={p.id} project={p} index={i} />
        ))}
      </div>
    </section>
  );
}
