import { NextResponse } from "next/server";
import { sendCalendarNotifications } from "@/modules/notifications/actions/send-calendar-notifications";
import { verifyCronAuth } from "@/lib/cron-auth";

/**
 * GET /api/cron/calendar-notifications
 *
 * Processes the CalendarNotificationQueue and sends batched emails.
 * Runs every 5 minutes via Vercel Cron.
 */
export async function GET(request: Request) {
  try {
    const authError = verifyCronAuth(request);
    if (authError) return authError;

    const result = await sendCalendarNotifications();

    if (result.success) {
      return NextResponse.json({
        success: true,
        ...result.data,
      });
    }

    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
