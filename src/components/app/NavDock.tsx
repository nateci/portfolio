"use client";

import { Briefcase, FileText, FolderGit2, House, Layers, Mail, Rows3 } from "lucide-react";
import { profile, projects } from "@/lib/content";
import { href } from "./route";

const sections = [
  { key: "projects", label: "Projects", icon: FolderGit2 },
  { key: "experience", label: "Experience", icon: Briefcase },
  { key: "stack", label: "Stack", icon: Layers },
  { key: "contact", label: "Contact", icon: Mail },
] as const;

// Desktop: top bar with a projects sub-menu on hover/focus. Phone: slim top
// bar plus a bottom tab bar (thumb reach).
export function NavDock({ parts }: { parts: string[] }) {
  const active = parts[0] ?? "home";

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line/60 bg-bg/60 backdrop-blur-xl">
        <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-5">
          <a href={href()} className="flex items-center gap-2 font-mono text-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-accent shadow-[0_0_10px_var(--color-accent)]" />
            <span className="text-ink">nateci</span>
          </a>

          <div className="hidden items-center gap-1 md:flex">
            {sections.map((s) =>
              s.key === "projects" ? (
                <div key={s.key} className="group relative">
                  <a
                    href={href("projects")}
                    aria-current={active === s.key ? "page" : undefined}
                    className={`block rounded-lg px-3.5 py-1.5 text-sm transition-colors ${
                      active === s.key ? "bg-panel-hi text-ink" : "text-ink-dim hover:text-ink"
                    }`}
                  >
                    {s.label}
                  </a>
                  {/* sub-menu: every project, one hop away */}
                  <div className="invisible absolute left-1/2 top-full w-64 -translate-x-1/2 pt-2 opacity-0 transition-[opacity,visibility] duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                    <div className="panel panel-glow p-1.5">
                      {projects.map((p) => (
                        <a
                          key={p.id}
                          href={href("projects", p.id)}
                          className="block rounded-md px-3 py-2 transition-colors hover:bg-panel-hi"
                        >
                          <div className="text-sm text-ink">{p.name}</div>
                          <div className="font-mono text-[0.62rem] uppercase tracking-wider text-ink-faint">{p.status}</div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <a
                  key={s.key}
                  href={href(s.key)}
                  aria-current={active === s.key ? "page" : undefined}
                  className={`rounded-lg px-3.5 py-1.5 text-sm transition-colors ${
                    active === s.key ? "bg-panel-hi text-ink" : "text-ink-dim hover:text-ink"
                  }`}
                >
                  {s.label}
                </a>
              ),
            )}
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/classic"
              title="The whole site as one scrolling page"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs text-ink-faint transition-colors hover:text-ink lg:inline-flex"
            >
              <Rows3 className="h-3.5 w-3.5" />
              classic view
            </a>
            <a
              href={profile.links.resume}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line-hi bg-panel px-3.5 py-1.5 font-mono text-xs text-ink transition-colors hover:border-accent hover:text-accent active:scale-[0.98]"
            >
              <FileText className="h-3.5 w-3.5" />
              resume
            </a>
          </div>
        </nav>
      </header>

      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-line bg-bg/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        {[{ key: "home", label: "Home", icon: House }, ...sections].map((s) => {
          const Icon = s.icon;
          const on = active === s.key;
          return (
            <a
              key={s.key}
              href={s.key === "home" ? href() : href(s.key)}
              aria-current={on ? "page" : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-[0.62rem] transition-colors ${on ? "text-accent" : "text-ink-faint"}`}
            >
              <Icon className="h-5 w-5" />
              {s.label}
            </a>
          );
        })}
      </nav>
    </>
  );
}
