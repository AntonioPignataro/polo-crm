"use server";

import { prisma } from "@/lib/prisma";
import { requirePreceptor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import {
  createCalendarEventSchema,
  type CreateCalendarEventInput,
} from "@/modules/calendar/schemas/calendar-event-schema";
import type { CalendarEventType } from "@/types";

export async function createCalendarEvent(
  input: CreateCalendarEventInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requirePreceptor();

    const parsed = createCalendarEventSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const { semester, title, date, eventType, description } = parsed.data;

    const eventDate = new Date(date);

    const event = await prisma.calendarEvent.create({
      data: {
        clubId: session.clubId,
        semester,
        title,
        date: eventDate,
        eventType: eventType as CalendarEventType,
        description: description ?? null,
        createdBy: session.userId,
      },
    });

    // Queue notification for batched sending
    await prisma.calendarNotificationQueue.create({
      data: {
        clubId: session.clubId,
        eventTitle: title,
        eventDate,
        changeType: "CREATED",
      },
    });

    revalidatePath("/calendario");
    return { success: true, data: { id: event.id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao criar evento.";
    return { success: false, error: message };
  }
}
