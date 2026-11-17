import { NextResponse } from "next/server";

import { getAuth } from "@/server/auth/auth";
import { resetDemoData } from "@/server/demo/data";
import { DEMO_ORG_SLUG, DEMO_OWNER_EMAIL, DEMO_PASSWORD } from "@/server/demo/mode";
import { AppError } from "@/server/errors";
import { clientIp } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

// A relative Location: behind a proxy or CDN, request.url can carry an internal
// host (for example Netlify's per-deploy URL), where the session cookie doesn't apply.
const seeOther = (location: string) =>
  new NextResponse(null, { status: 303, headers: { location } });

/**
 * POST /api/demo/sign-in - "Try the demo" button. Every visit starts from the
 * pristine demo data (this instance's copy is reset first). The session for
 * the seeded owner is created here, on the server, so visitors never type (or
 * see) a password. A plain form POST, not
 * a link, so prefetchers and crawlers don't mint sessions.
 */
export async function POST(request: Request) {
  const back = (reason: string) => seeOther(`/sign-in?demo=${reason}`);
  try {
    await enforceRateLimit(`demo-sign-in:${clientIp(request.headers)}`, {
      limit: 20,
      windowSeconds: 600,
    });
    await resetDemoData();
    const auth = await getAuth().api.signInEmail({
      body: { email: DEMO_OWNER_EMAIL, password: DEMO_PASSWORD },
      headers: request.headers,
      asResponse: true,
    });
    if (!auth.ok) return back("unavailable");

    const response = seeOther(`/app/${DEMO_ORG_SLUG}`);
    for (const cookie of auth.headers.getSetCookie()) response.headers.append("set-cookie", cookie);
    return response;
  } catch (err) {
    if (err instanceof AppError && err.code === "RATE_LIMITED") return back("busy");
    console.error("[demo] sign-in failed", err);
    return back("unavailable");
  }
}
