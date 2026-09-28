import { NextResponse } from "next/server";

/**
 * Verify cron request authentication.
 * Accepts either:
 *   - Vercel Cron `Authorization: Bearer <CRON_SECRET>` header
 *   - Query parameter `?key=<CRON_SECRET>` (for manual testing)
 *
 * Returns null if authorized, or a NextResponse error if not.
 */
export function verifyCronAuth(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured on server." },
      { status: 500 }
    );
  }

  // Check Authorization header (Vercel Cron sends this automatically)
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) {
    return null; // Authorized
  }

  // Fallback: check query parameter (for manual testing)
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  if (key === cronSecret) {
    return null; // Authorized
  }

  return NextResponse.json(
    { error: "Unauthorized." },
    { status: 401 }
  );
}
