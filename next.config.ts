import type { NextConfig } from "next";
import path from "node:path";

// Content-Security-Policy. 'unsafe-inline' is required by Next's inline
// hydration/bootstrap scripts in a static (nonce-less) deployment, and
// 'wasm-unsafe-eval' is required to instantiate the kepler-wasm module.
// Everything else is locked to same-origin.
//
// 'unsafe-eval' is added ONLY in development: React's dev build uses eval()
// for debugging features. Production React never calls eval(), so prod stays
// strict (no 'unsafe-eval').
const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
  "connect-src 'self'",
  "upgrade-insecure-requests",
  // report violations to /api/csp-report (modern report-to + legacy report-uri)
  "report-to csp-endpoint",
  "report-uri /api/csp-report",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // names the reporting group referenced by `report-to` above
  { key: "Reporting-Endpoints", value: 'csp-endpoint="/api/csp-report"' },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  // Pin the workspace root — there are stray lockfiles higher up the tree.
  turbopack: {
    root: path.join(__dirname),
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
