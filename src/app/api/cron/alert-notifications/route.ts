import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAlertNotifications } from "@/modules/notifications/actions/send-alert-notifications";
import { verifyCronAuth } from "@/lib/cron-auth";

/**
 * GET /api/cron/alert-notifications
 *
 * Automated alert notification endpoint.
 * Runs on the last day of each month at 21:00 UTC (18:00 BRT) via Vercel Cron.
 *
 * Checks attendance, preceptoria, and formação pais alerts, then sends
 * emails with report attachments (PDF + Excel) to DIRETORs and PRECEPTORs.
 */
export async function GET(request: Request) {
  try {
    const authError = verifyCronAuth(request);
    if (authError) return authError;

    // Only run on the last day of the month
    const now = new Date();
    const lastDayOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate();

    if (now.getDate() !== lastDayOfMonth) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: `Not the last day of the month (today: ${now.getDate()}, last: ${lastDayOfMonth}).`,
      });
    }

    // Get all active clubs
    const clubs = await prisma.club.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    const results: Array<{
      clubId: string;
      clubName: string;
      attendanceAlerts: number;
      preceptoriaAlerts: number;
      formacaoPaisAlerts: number;
      emailsSent: number;
      notificationsCreated: number;
      error?: string;
    }> = [];

    for (const club of clubs) {
      const result = await sendAlertNotifications(club.id);
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
          attendanceAlerts: 0,
          preceptoriaAlerts: 0,
          formacaoPaisAlerts: 0,
          emailsSent: 0,
          notificationsCreated: 0,
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
