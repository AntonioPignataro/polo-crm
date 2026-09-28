"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession, type ActionResult } from "@/lib/auth-utils";
import { signedDownloadUrl } from "@/lib/storage";

const MONITOR_PLUS = ["SUPER_ADMIN", "DIRETOR", "PRECEPTOR", "MONITOR"];

/**
 * Return a short-lived signed download URL for a file, if the current user may
 * see it. Parents (non-monitor) can only open files marked visible to everyone.
 */
export async function getReportFileDownloadUrl(
  id: string
): Promise<ActionResult<{ url: string }>> {
  try {
    const session = await getRequiredSession();
    const file = await prisma.reportFile.findFirst({
      where: { id, clubId: session.clubId },
      select: { storagePath: true, visibility: true },
    });
    if (!file) {
      return { success: false, error: "Arquivo não encontrado." };
    }
    if (!MONITOR_PLUS.includes(session.role) && file.visibility !== "ALL") {
      return { success: false, error: "Você não tem acesso a este arquivo." };
    }

    const url = await signedDownloadUrl(file.storagePath, 120);
    return { success: true, data: { url } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao gerar o link.";
    return { success: false, error: message };
  }
}
