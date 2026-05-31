"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeader({
  index,
  title,
  sub,
}: {
  index: string;
  title: string;
  sub?: string;
}) {
  return (
    <Reveal className="mb-10">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-accent">{index}</span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-grad md:text-4xl">{title}</h2>
      {sub && <p className="mt-2 max-w-xl text-ink-dim">{sub}</p>}
    </Reveal>
  );
}
