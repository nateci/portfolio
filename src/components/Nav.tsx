"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { profile } from "@/lib/content";

const links = [
  { href: "#work", label: "Work" },
  { href: "#experience", label: "Experience" },
  { href: "#stack", label: "Stack" },
  { href: "#contact", label: "Contact" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? "border-b border-line bg-bg/80 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <a href="#top" className="group flex items-center gap-2 font-mono text-sm">
          <span className="inline-block h-2 w-2 rounded-full bg-accent shadow-[0_0_10px_var(--color-accent)]" />
          <span className="text-ink">nateci</span>
        </a>

        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-ink-dim transition-colors hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </div>

        <a
          href={`mailto:${profile.email}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line-hi bg-panel px-3.5 py-1.5 font-mono text-xs text-ink transition-colors hover:border-accent hover:text-accent active:scale-[0.98]"
        >
          <Mail className="h-3.5 w-3.5" />
          get in touch
        </a>
      </nav>
    </header>
  );
}
