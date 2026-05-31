import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { profile, education } from "@/lib/content";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Person structured data so search engines resolve natecirino.com to the
// "Nate Cirino" entity (and merge it with the LinkedIn/GitHub it already knows).
const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  url: "https://natecirino.com",
  jobTitle: profile.role,
  email: `mailto:${profile.email}`,
  alumniOf: { "@type": "CollegeOrUniversity", name: education.school },
  sameAs: [profile.links.github, profile.links.linkedin],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://natecirino.com"),
  title: "Nate Cirino · Software Engineer",
  description:
    "Software engineer building distributed systems in Rust, from-scratch storage engines, and CI/CD at scale. Live, interactive demos of the work.",
  openGraph: {
    title: "Nate Cirino · Software Engineer",
    description:
      "Distributed systems in Rust, from-scratch storage engines, CI/CD at scale, with live interactive demos.",
    url: "https://natecirino.com",
    siteName: "Nate Cirino",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nate Cirino · Software Engineer",
    description:
      "Distributed systems in Rust, from-scratch storage engines, CI/CD at scale.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-ink">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
