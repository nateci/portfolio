import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { SceneCanvas } from "@/components/SceneCanvas";
import { Hero } from "@/components/Hero";
import { Work } from "@/components/Work";
import { Experience } from "@/components/Experience";
import { Stack } from "@/components/Stack";
import { Contact, Footer } from "@/components/Contact";

// The original single-page scroll layout, kept for visitors who just want to
// skim everything top to bottom. The camera follows scroll here.
export const metadata: Metadata = {
  alternates: { canonical: "/classic" },
};

export default function Classic() {
  return (
    <>
      <SceneCanvas mode="scroll" />
      <Nav />
      <main className="flex-1">
        <Hero />
        <Work />
        <Experience />
        <Stack />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
