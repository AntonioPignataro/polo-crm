"use server";

import { prisma } from "@/lib/prisma";
import { requireMonitor, type ActionResult } from "@/lib/auth-utils";
import { deleteFromStorage } from "@/lib/storage";
import { revalidatePath } from "next/cache";

export async function deleteReportFile(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireMonitor();
    const file = await prisma.reportFile.findFirst({
      where: { id, clubId: session.clubId },
      select: { id: true, storagePath: true },
    });
    if (!file) {
      return { success: false, error: "Arquivo não encontrado." };
    }

    await deleteFromStorage(file.storagePath);
    await prisma.reportFile.delete({ where: { id: file.id } });

    revalidatePath("/relatorios");
    revalidatePath("/documentos");
    return { success: true, data: { id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao excluir arquivo.";
    return { success: false, error: message };
  }
}
