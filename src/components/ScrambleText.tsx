"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

// ---------------------------------------------------------------------------
// "Decrypt" reveal: each character cycles through random glyphs, then resolves
// to its final letter left-to-right - like a hash settling. Character count is
// preserved so there's no layout shift / line-break jump. Reduced-motion users
// just get the final text immediately.
// ---------------------------------------------------------------------------

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/\\[]{}=+*#%";

export function ScrambleText({
  text,
  className,
  duration = 900,
  startDelay = 0,
}: {
  text: string;
  className?: string;
  duration?: number;
  startDelay?: number;
}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(text); // SSR + initial = final (no hydration mismatch)
  const raf = useRef(0);

  useEffect(() => {
    if (reduced) {
      setDisplay(text);
      return;
    }

    const chars = text.split("");
    const n = chars.length;
    let start = 0;
    let lastGlyph = 0;
    let scramble = chars.map(() => GLYPHS[(Math.random() * GLYPHS.length) | 0]);

    const tick = (t: number) => {
      if (!start) start = t + startDelay;
      const elapsed = t - start;

      if (elapsed < 0) {
        // pre-delay: show fully scrambled (but keep spaces)
        setDisplay(chars.map((c, i) => (c === " " ? " " : scramble[i])).join(""));
        raf.current = requestAnimationFrame(tick);
        return;
      }

      // refresh the random glyphs every ~45ms so unresolved chars flicker
      if (t - lastGlyph > 45) {
        lastGlyph = t;
        scramble = scramble.map(() => GLYPHS[(Math.random() * GLYPHS.length) | 0]);
      }

      const progress = elapsed / duration; // 0 → 1
      const out = chars.map((c, i) => {
        if (c === " ") return " ";
        const revealAt = (i + 1) / n; // left-to-right
        return progress >= revealAt ? c : scramble[i];
      });
      setDisplay(out.join(""));

      if (progress < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        setDisplay(text);
      }
    };

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [text, duration, startDelay, reduced]);

  return (
    <span className={className} aria-label={text} suppressHydrationWarning>
      {display}
    </span>
  );
}
