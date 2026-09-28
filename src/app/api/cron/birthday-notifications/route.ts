import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBirthdayNotifications } from "@/modules/notifications/actions/send-birthday-notifications";
import { verifyCronAuth } from "@/lib/cron-auth";

/**
 * GET /api/cron/birthday-notifications
 *
 * Automated birthday notification endpoint.
 * Runs every Monday at 15:00 UTC via Vercel Cron.
 * Sends weekly birthday summaries to directors.
 */
export async function GET(request: Request) {
  try {
    const authError = verifyCronAuth(request);
    if (authError) return authError;

    // Get all active clubs
    const clubs = await prisma.club.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    const results: Array<{
      clubId: string;
      clubName: string;
      birthdayCount: number;
      created: number;
      sent: number;
      error?: string;
    }> = [];

    for (const club of clubs) {
      const result = await sendBirthdayNotifications(club.id);
      if (result.success) {
        results.push({
          clubId: club.id,
          clubName: club.name,
          ...result.data,
        });
      } else {
        results.push({
          clubId: club.id,
          clubName: club.name,
          birthdayCount: 0,
          created: 0,
          sent: 0,
          error: result.error,
        });
      }
    }

    return NextResponse.json({
      success: true,
      clubsProcessed: clubs.length,
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
