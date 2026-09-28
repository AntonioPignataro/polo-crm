"use server";

import { prisma } from "@/lib/prisma";
import { requirePreceptor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

export interface DeleteCalendarEventInput {
  eventId: string;
}

export async function deleteCalendarEvent(
  input: DeleteCalendarEventInput
): Promise<ActionResult<void>> {
  try {
    const session = await requirePreceptor();

    const { eventId } = input;

    if (!eventId) {
      return { success: false, error: "ID do evento é obrigatório." };
    }

    // Verify event belongs to user's club
    const existing = await prisma.calendarEvent.findFirst({
      where: { id: eventId, clubId: session.clubId },
    });

    if (!existing) {
      return { success: false, error: "Evento não encontrado no seu clube." };
    }

    // Delete the event
    await prisma.calendarEvent.delete({
      where: { id: eventId },
    });

    // Queue notification for batched sending
    await prisma.calendarNotificationQueue.create({
      data: {
        clubId: session.clubId,
        eventTitle: existing.title,
        eventDate: existing.date,
        changeType: "DELETED",
      },
    });

    revalidatePath("/calendario");
    return { success: true, data: undefined };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao excluir evento.";
    return { success: false, error: message };
  }
}
