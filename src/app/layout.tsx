import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://natecirino.com"),
  title: "nateci",
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
      <body className="min-h-full flex flex-col bg-bg text-ink">{children}</body>
    </html>
  );
}
