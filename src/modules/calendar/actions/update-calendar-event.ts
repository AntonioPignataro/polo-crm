"use server";

import { prisma } from "@/lib/prisma";
import { requirePreceptor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import type { CalendarEventType } from "@/types";

export interface UpdateCalendarEventInput {
  eventId: string;
  title: string;
  description?: string;
  date: string;
  eventType: string;
}

export async function updateCalendarEvent(
  input: UpdateCalendarEventInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requirePreceptor();

    const { eventId, title, description, date, eventType } = input;

    if (!eventId || !title || !date || !eventType) {
      return { success: false, error: "Campos obrigatórios não preenchidos." };
    }

    // Verify event belongs to user's club
    const existing = await prisma.calendarEvent.findFirst({
      where: { id: eventId, clubId: session.clubId },
    });

    if (!existing) {
      return { success: false, error: "Evento não encontrado no seu clube." };
    }

    const eventDate = new Date(date);

    const event = await prisma.calendarEvent.update({
      where: { id: eventId },
      data: {
        title,
        date: eventDate,
        eventType: eventType as CalendarEventType,
        description: description ?? null,
      },
    });

    // Queue notification for batched sending
    await prisma.calendarNotificationQueue.create({
      data: {
        clubId: session.clubId,
        eventTitle: title,
        eventDate,
        changeType: "UPDATED",
      },
    });

    revalidatePath("/calendario");
    return { success: true, data: { id: event.id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao atualizar evento.";
    return { success: false, error: message };
  }
}
