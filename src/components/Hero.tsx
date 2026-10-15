"use client";

import { motion } from "motion/react";
import { ArrowRight, Compass, FileText } from "lucide-react";
import { profile, projects } from "@/lib/content";
import { GithubIcon, LinkedinIcon } from "./icons";
import { HeroField } from "./HeroField";
import { Magnetic } from "./Magnetic";
import { ScrambleText } from "./ScrambleText";
import { Telemetry } from "./Telemetry";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * `tour`: the 3D app's landing view. Swaps the primary button for a big
 * "Start the tour" call-to-action and adds jump links into each project.
 */
export function Hero({ workHref = "#work", tour = false }: { workHref?: string; tour?: boolean }) {
  return (
    <section id="top" className="relative overflow-hidden">
      {/* 2D field only shows if the WebGL world fails to start */}
      <div className="scene-fallback pointer-events-none absolute inset-0">
        <HeroField />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(70%_60%_at_50%_0%,#000_30%,transparent_100%)]" />
      <div className="pointer-events-none absolute inset-0 glow-radial" />
      {/* readability scrim: darkens behind text, lets the field breathe right */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg via-bg/55 to-transparent [mask-image:linear-gradient(to_bottom,#000_65%,transparent_100%)]" />

      <div className="relative mx-auto max-w-6xl px-5 pt-36 pb-20 md:pt-44 md:pb-28">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="flex items-center gap-2.5"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green" />
          </span>
          <span className="eyebrow text-ink-dim">
            {profile.available} · {profile.location}
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.05 }}
          className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-grad md:text-6xl"
        >
          <ScrambleText text={profile.name} duration={1050} />.
          <br />
          <span className="text-ink-dim">
            <ScrambleText text={profile.role} duration={1050} startDelay={520} />.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.12 }}
          className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-dim"
        >
          {profile.tagline}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.19 }}
          className="mt-9 flex flex-wrap items-center gap-3"
        >
          <Magnetic>
            {tour ? (
              <a
                href={workHref}
                className="tour-cta group inline-flex items-center gap-2.5 rounded-xl bg-accent px-6 py-3.5 text-base font-semibold text-bg transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <Compass className="h-5 w-5" />
                Start the tour
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </a>
            ) : (
              <a
                href={workHref}
                className="group inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-bg transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
              >
                Explore the work
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            )}
          </Magnetic>
          <Magnetic>
            <a
              href={profile.links.resume}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-line-hi bg-panel px-5 py-2.5 text-sm text-ink transition-colors hover:border-accent hover:text-accent active:scale-[0.98]"
            >
              <FileText className="h-4 w-4" />
              Resume
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
        </motion.div>

        {tour && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.24 }}
            className="mt-5"
          >
            <p className="font-mono text-xs text-ink-faint">
              {projects.length} projects with live demos · experience · stack · about 2 minutes
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-ink-faint">or jump to</span>
              {projects.map((p) => (
                <a
                  key={p.id}
                  href={`#/projects/${p.id}`}
                  className="rounded-full border border-line-hi bg-bg/60 px-3 py-1 text-xs text-ink-dim backdrop-blur transition-colors hover:border-accent hover:text-accent"
                >
                  {p.name.replace("NOAA AUV ", "")}
                </a>
              ))}
              <a
                href="#/experience"
                className="rounded-full border border-line-hi bg-bg/60 px-3 py-1 text-xs text-ink-dim backdrop-blur transition-colors hover:border-accent hover:text-accent"
              >
                Experience
              </a>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.28 }}
          className="mt-14"
        >
          <Telemetry />
        </motion.div>
      </div>
    </section>
  );
}
