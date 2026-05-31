"use client";

import { experience } from "@/lib/content";
import { Reveal, SectionHeader } from "./Reveal";

export function Experience() {
  return (
    <section id="experience" className="mx-auto max-w-6xl px-5 py-24">
      <SectionHeader index="02 / experience" title="Where I've shipped" />

      <div className="relative">
        {/* spine */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-line md:left-[calc(11rem+7px)]" />

        <div className="flex flex-col gap-9">
          {experience.map((e, i) => (
            <Reveal key={e.company} delay={i * 0.04}>
              <div className="grid gap-4 md:grid-cols-[11rem_1fr]">
                <div className="hidden pt-0.5 text-right md:block">
                  <div className="font-mono text-xs text-ink-faint">{e.period}</div>
                  <div className="mt-1 font-mono text-[0.68rem] text-ink-faint">{e.location}</div>
                </div>

                <div className="relative pl-7">
                  <span
                    className={`absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 ${
                      e.current
                        ? "border-green bg-green/20 shadow-[0_0_10px_var(--color-green)]"
                        : e.incoming
                          ? "border-amber bg-amber/20 shadow-[0_0_10px_var(--color-amber)]"
                          : "border-line-hi bg-bg"
                    }`}
                  />
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <h3 className="text-lg font-semibold text-ink">{e.company}</h3>
                    <span className="text-sm text-accent">{e.role}</span>
                    {e.current && (
                      <span className="font-mono text-[0.6rem] uppercase tracking-wider text-green">
                        ● current
                      </span>
                    )}
                    {e.incoming && (
                      <span className="font-mono text-[0.6rem] uppercase tracking-wider text-amber">
                        ● incoming
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 font-mono text-[0.68rem] text-ink-faint md:hidden">
                    {e.period} · {e.location}
                  </div>
                  <ul className="mt-2.5 flex flex-col gap-1.5">
                    {e.points.map((p, j) => (
                      <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-ink-dim">
                        <span className="mt-2 inline-block h-1 w-1 flex-none rounded-full bg-line-hi" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
