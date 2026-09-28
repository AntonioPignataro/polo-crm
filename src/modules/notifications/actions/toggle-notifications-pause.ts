"use server";

import { prisma } from "@/lib/prisma";
import { requireDiretor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

export async function toggleNotificationsPause(): Promise<
  ActionResult<{ paused: boolean }>
> {
  try {
    const session = await requireDiretor();

    const club = await prisma.club.findUnique({
      where: { id: session.clubId },
      select: { notificationsPaused: true },
    });

    if (!club) {
      return { success: false, error: "Clube não encontrado." };
    }

    const newValue = !club.notificationsPaused;

    await prisma.club.update({
      where: { id: session.clubId },
      data: { notificationsPaused: newValue },
    });

    revalidatePath("/notificacoes");
    return { success: true, data: { paused: newValue } };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao alterar configuração de notificações.";
    return { success: false, error: message };
  }
}
