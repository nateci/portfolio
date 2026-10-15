// Tiny bridge between the React UI and the lazily-loaded WebGL world. The UI
// says where the camera should be; the world (once it exists) follows. The
// last request is remembered so a world that loads late still lands right.
// Deliberately free of three.js imports so it costs nothing in the main bundle.

export type Destination =
  | "home"
  | "projects"
  | "kepler"
  | "lsm"
  | "sentinel"
  | "argus"
  | "sonar"
  | "stack"
  | "contact"
  | `experience:${number}`;

type Listener = (d: Destination) => void;

let current: Destination = "home";
const listeners = new Set<Listener>();

export function flyTo(d: Destination) {
  if (d === current) return;
  current = d;
  listeners.forEach((fn) => fn(d));
}

export function onDestination(fn: Listener) {
  listeners.add(fn);
  fn(current);
  return () => listeners.delete(fn);
}
