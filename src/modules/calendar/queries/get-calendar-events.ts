"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";
import type { CalendarEventType } from "@/types";

export interface CalendarEventItem {
  id: string;
  title: string;
  date: string;
  type: CalendarEventType;
  description: string | null;
}

export async function getCalendarEvents(
  semester: string
): Promise<CalendarEventItem[]> {
  const session = await getRequiredSession();

  const events = await prisma.calendarEvent.findMany({
    where: {
      clubId: session.clubId,
      semester,
    },
    orderBy: { date: "asc" },
  });

  return events.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date.toISOString().split("T")[0],
    type: e.eventType,
    description: e.description,
  }));
}
