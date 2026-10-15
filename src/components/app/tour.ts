import { projects } from "@/lib/content";

// The guided path a first-time visitor is walked through, in order.
export const TOUR: { parts: string[]; label: string }[] = [
  { parts: ["projects"], label: "All projects" },
  ...projects.map((p) => ({ parts: ["projects", p.id], label: p.name })),
  { parts: ["experience"], label: "Experience" },
  { parts: ["stack"], label: "Stack" },
  { parts: ["contact"], label: "Contact" },
];

/** index of the current route in the tour, or -1 (home / off-tour) */
export function tourIndex(parts: string[]) {
  const [section, id] = parts;
  if (!section) return -1;
  if (section === "projects") return TOUR.findIndex((s) => s.parts[0] === "projects" && s.parts[1] === id);
  return TOUR.findIndex((s) => s.parts[0] === section);
}
