"use server";

import { prisma } from "@/lib/prisma";
import { requireMonitor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

export async function reorderQueue(
  orderedIds: string[]
): Promise<ActionResult> {
  try {
    const session = await requireMonitor();

    // Verify all queue entries belong to sessions in this club
    const validCount = await prisma.priestQueue.count({
      where: {
        id: { in: orderedIds },
        session: { clubId: session.clubId },
      },
    });

    if (validCount !== orderedIds.length) {
      return {
        success: false,
        error: "Itens da fila não pertencem ao seu clube.",
      };
    }

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.priestQueue.update({
          where: { id },
          data: { position: index + 1 },
        })
      )
    );

    revalidatePath("/atendimentos");
    return { success: true, data: undefined };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao reordenar fila.";
    return { success: false, error: message };
  }
}
