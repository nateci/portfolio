import { NextResponse } from "next/server";

// CSP violation report sink. Browsers POST here (unauthenticated, by spec)
// whenever a directive is violated. It is intentionally write-only: it logs a
// bounded slice of the report to the server logs and returns 204. It stores
// nothing and exposes nothing, so there's no data surface to attack.

const MAX_LOG = 2000;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    if (body) {
      // Reports arrive as application/csp-report or application/reports+json.
      console.warn("[csp-report]", body.slice(0, MAX_LOG));
    }
  } catch {
    // never let a malformed report throw
  }
  return new NextResponse(null, { status: 204 });
}

// Anything other than POST is not a valid report submission.
export function GET() {
  return new NextResponse(null, { status: 405 });
}
