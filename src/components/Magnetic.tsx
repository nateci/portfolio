"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "motion/react";

// ---------------------------------------------------------------------------
// Magnetic wrapper: while the cursor is over the element, the child drifts
// toward it (clamped), springing back on leave. Disabled under reduced-motion.
// ---------------------------------------------------------------------------

export function Magnetic({
  children,
  strength = 0.4,
  max = 10,
  className,
}: {
  children: ReactNode;
  strength?: number;
  max?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 16, mass: 0.3 });
  const sy = useSpring(y, { stiffness: 220, damping: 16, mass: 0.3 });

  const clamp = (v: number) => Math.max(-max, Math.min(max, v));

  const onMove = (e: React.MouseEvent) => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    x.set(clamp((e.clientX - (r.left + r.width / 2)) * strength));
    y.set(clamp((e.clientY - (r.top + r.height / 2)) * strength));
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.span
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ x: reduced ? 0 : sx, y: reduced ? 0 : sy, display: "inline-flex" }}
      className={className}
    >
      {children}
    </motion.span>
  );
}
