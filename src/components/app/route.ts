"use client";

import { useEffect, useState } from "react";

// Minimal hash router: "#/projects/kepler" -> ["projects", "kepler"]. Hash
// routes keep the site fully static, make every view linkable, and give the
// back button meaning without any server routing.

const parse = (hash: string) => hash.replace(/^#\/?/, "").split("/").filter(Boolean);

export const href = (...parts: string[]) => `#/${parts.join("/")}`;

export function useHashRoute() {
  const [parts, setParts] = useState<string[]>([]);
  useEffect(() => {
    const read = () => setParts(parse(window.location.hash));
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  return parts;
}

export function go(...parts: string[]) {
  window.location.hash = href(...parts);
}
