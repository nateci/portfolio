import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Work } from "@/components/Work";
import { Experience } from "@/components/Experience";
import { Stack } from "@/components/Stack";
import { Contact, Footer } from "@/components/Contact";

export default function Home() {
  return (
    <>
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
