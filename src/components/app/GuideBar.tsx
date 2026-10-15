"use client";

import { ArrowRight, ChevronLeft, RotateCcw } from "lucide-react";
import { href } from "./route";
import { TOUR, tourIndex } from "./tour";

// Always-visible "you are here / go here next" pill for first-time visitors.
// Sits over the 3D side of the screen (top-right on desktop, under the nav on
// phones) so it never covers panel content.
export function GuideBar({ parts }: { parts: string[] }) {
  const i = tourIndex(parts);
  if (i < 0) return null;
  const prev = i > 0 ? href(...TOUR[i - 1].parts) : href();
  const next = TOUR[i + 1];

  return (
    <nav
      aria-label="Guided tour"
      className="fixed inset-x-2 top-16 z-40 flex items-center gap-2 rounded-xl border border-line-hi bg-bg/80 p-1.5 pl-3 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl md:inset-x-auto md:right-4 md:top-[4.5rem]"
    >
      <div className="min-w-0 flex-1 md:flex-none">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-ink-faint">tour</span>
          <span className="font-mono text-[0.65rem] text-ink-dim">
            {i + 1} / {TOUR.length}
          </span>
        </div>
        {/* progress dots double as jump links */}
        <div className="mt-1 flex items-center gap-1">
          {TOUR.map((s, j) => (
            <a
              key={s.label}
              href={href(...s.parts)}
              title={s.label}
              aria-label={`Tour stop ${j + 1}: ${s.label}`}
              aria-current={j === i ? "step" : undefined}
              className={`h-1.5 rounded-full transition-all ${
                j === i ? "w-5 bg-accent" : j < i ? "w-1.5 bg-accent/50 hover:bg-accent" : "w-1.5 bg-line-hi hover:bg-ink-faint"
              }`}
            />
          ))}
        </div>
      </div>

      <a
        href={prev}
        aria-label="Previous stop"
        className="rounded-lg border border-line p-2 text-ink-dim transition-colors hover:border-line-hi hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" />
      </a>
      {next ? (
        <a
          href={href(...next.parts)}
          className="group inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-bg transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <span className="hidden sm:inline">Next:</span> {next.label}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </a>
      ) : (
        <a
          href={href()}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-line-hi bg-panel px-3.5 py-2 text-sm text-ink transition-colors hover:border-accent hover:text-accent"
        >
          <RotateCcw className="h-4 w-4" /> Back to start
        </a>
      )}
    </nav>
  );
}
