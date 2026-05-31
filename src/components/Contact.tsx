"use client";

import { Mail } from "lucide-react";
import { profile } from "@/lib/content";
import { GithubIcon, LinkedinIcon } from "./icons";
import { Magnetic } from "./Magnetic";
import { Reveal, SectionHeader } from "./Reveal";

export function Contact() {
  return (
    <section id="contact" className="mx-auto max-w-6xl px-5 py-24">
      <SectionHeader
        index="04 / contact"
        title="Building something hard? Let's talk."
        sub="Fastest way to reach me is email."
      />
      <Reveal delay={0.05}>
        <div className="flex flex-wrap gap-3">
          <Magnetic>
            <a
              href={`mailto:${profile.email}`}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-bg transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <Mail className="h-4 w-4" />
              {profile.email}
            </a>
          </Magnetic>
          <Magnetic>
            <a
              href={profile.links.github}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-line-hi bg-panel px-5 py-2.5 text-sm text-ink transition-colors hover:border-accent hover:text-accent active:scale-[0.98]"
            >
              <GithubIcon className="h-4 w-4" />
              GitHub
            </a>
          </Magnetic>
          <Magnetic>
            <a
              href={profile.links.linkedin}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-line-hi bg-panel px-5 py-2.5 text-sm text-ink transition-colors hover:border-accent hover:text-accent active:scale-[0.98]"
            >
              <LinkedinIcon className="h-4 w-4" />
              LinkedIn
            </a>
          </Magnetic>
        </div>
      </Reveal>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-8 text-center font-mono text-xs text-ink-faint">
        © {new Date().getFullYear()} nateci
      </div>
    </footer>
  );
}
