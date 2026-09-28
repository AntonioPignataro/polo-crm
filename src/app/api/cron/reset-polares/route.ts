import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronAuth } from "@/lib/cron-auth";

/**
 * GET /api/cron/reset-polares
 *
 * Annual polares reset. Clears all `polaresUntil` fields for every member,
 * effectively removing all G2 opt-ins for the new year.
 *
 * Should be triggered by a cron job at Dec 31 12:00 (UTC).
 * Schedule: "0 12 31 12 *"
 */
export async function GET(request: Request) {
  try {
    const authError = verifyCronAuth(request);
    if (authError) return authError;

    // Clear polaresUntil for all members that have it set
    const result = await prisma.member.updateMany({
      where: {
        polaresUntil: { not: null },
      },
      data: {
        polaresUntil: null,
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      clearedCount: result.count,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
