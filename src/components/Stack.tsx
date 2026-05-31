"use client";

import { skills, education } from "@/lib/content";
import { Reveal, SectionHeader } from "./Reveal";

export function Stack() {
  return (
    <section id="stack" className="mx-auto max-w-6xl px-5 py-24">
      <SectionHeader index="03 / stack" title="Tools & Frameworks" />

      <div className="grid gap-5 md:grid-cols-3">
        {skills.map((g, i) => (
          <Reveal key={g.group} delay={i * 0.05}>
            <div className="panel h-full p-5">
              <div className="eyebrow mb-3">{g.group}</div>
              <div className="flex flex-wrap gap-1.5">
                {g.items.map((s) => (
                  <span
                    key={s}
                    className="rounded-md border border-line bg-bg-elev px-2.5 py-1 font-mono text-[0.7rem] text-ink-dim transition-colors hover:border-accent hover:text-accent"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.1}>
        <div className="panel mt-5 flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <div className="text-lg font-semibold text-ink">{education.school}</div>
            <div className="text-sm text-ink-dim">{education.degree}</div>
            <div className="mt-1 font-mono text-xs text-ink-faint">
              {education.detail} · {education.period}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {education.honors.map((h) => (
              <span
                key={h}
                className="rounded-md border border-amber/30 bg-amber/10 px-2.5 py-1 font-mono text-[0.68rem] text-amber"
              >
                {h}
              </span>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
