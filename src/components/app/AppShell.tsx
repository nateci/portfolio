"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { projects } from "@/lib/content";
import { flyTo } from "../scene/bus";
import { Hero } from "../Hero";
import { GuideBar } from "./GuideBar";
import { NavDock } from "./NavDock";
import { ContactPanel, ExperiencePanel, ProjectDetail, ProjectsOverview, StackPanel } from "./panels";
import { href, useHashRoute } from "./route";

// ---------------------------------------------------------------------------
// The navigable 3D site. The hash route picks a view; each view tells the
// WebGL world where to fly (via the scene bus) and renders its HTML panel
// beside the framed subject. The classic scrolling page lives at /classic.
// ---------------------------------------------------------------------------

function HomeView() {
  useEffect(() => flyTo("home"), []);
  return (
    <div className="fixed inset-0 overflow-y-auto pb-20 md:pb-0">
      <Hero workHref={href("projects")} tour />
    </div>
  );
}

function View({ parts }: { parts: string[] }) {
  const [section, id] = parts;
  if (section === "projects") {
    return id && projects.some((p) => p.id === id) ? <ProjectDetail id={id} /> : <ProjectsOverview />;
  }
  if (section === "experience") return <ExperiencePanel id={id} />;
  if (section === "stack") return <StackPanel />;
  if (section === "contact") return <ContactPanel />;
  return <HomeView />;
}

export function AppShell() {
  const parts = useHashRoute();
  const reduced = useReducedMotion();
  // project-to-project and role-to-role keep the panel mounted (no flicker);
  // only switching sections animates the panel out and in
  const key = parts[0] ?? "home";
  const sub = parts[0] === "projects" && parts[1] ? "detail" : "";

  return (
    <>
      <NavDock parts={parts} />
      <GuideBar parts={parts} />
      <AnimatePresence mode="wait">
        <motion.div
          key={key + sub}
          initial={reduced ? false : { opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, x: -16 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <View parts={parts} />
        </motion.div>
      </AnimatePresence>
    </>
  );
}
