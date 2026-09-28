import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronAuth } from "@/lib/cron-auth";

/**
 * GET /api/cron/keep-alive
 *
 * Minimal database ping to prevent Supabase free-tier from pausing
 * the project due to inactivity. Runs every 6 days via Vercel Cron.
 */
export async function GET(request: Request) {
  try {
    const authError = verifyCronAuth(request);
    if (authError) return authError;

    // Minimal query — just count clubs to keep the DB active
    const count = await prisma.club.count();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      clubs: count,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
