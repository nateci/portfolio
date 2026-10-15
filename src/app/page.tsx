import { SceneCanvas } from "@/components/SceneCanvas";
import { AppShell } from "@/components/app/AppShell";

// The navigable 3D site: pick a project, role, or section and the camera flies
// there. The full scrolling page is at /classic.
export default function Home() {
  return (
    <>
      <SceneCanvas mode="nav" />
      <AppShell />
    </>
  );
}
