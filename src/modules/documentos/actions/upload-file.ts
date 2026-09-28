"use server";

import { prisma } from "@/lib/prisma";
import { requireMonitor, type ActionResult } from "@/lib/auth-utils";
import { uploadToStorage } from "@/lib/storage";
import { revalidatePath } from "next/cache";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * Upload a file to the club's documentos bucket and record it (MONITOR+).
 * `visibility` = "ALL" makes it visible to parents on the Documentos screen;
 * anything else keeps it MONITOR+ only.
 */
export async function uploadReportFile(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireMonitor();

    const file = formData.get("file");
    const rawName = (formData.get("name") as string | null)?.trim();
    const visibility = formData.get("visibility") === "ALL" ? "ALL" : "MONITOR";

    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: "Selecione um arquivo." };
    }
    if (file.size > MAX_BYTES) {
      return { success: false, error: "Arquivo muito grande (máximo 20 MB)." };
    }

    const name = rawName || file.name;
    const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-80);
    const path = `${session.clubId}/${crypto.randomUUID()}-${safe}`;

    const bytes = new Uint8Array(await file.arrayBuffer());
    await uploadToStorage(path, bytes, file.type || "application/octet-stream");

    const record = await prisma.reportFile.create({
      data: {
        clubId: session.clubId,
        name,
        storagePath: path,
        mimeType: file.type || null,
        sizeBytes: file.size,
        visibility,
        uploadedBy: session.userId,
        uploaderName: session.name ?? null,
      },
      select: { id: true },
    });

    revalidatePath("/relatorios");
    revalidatePath("/documentos");
    return { success: true, data: { id: record.id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao enviar arquivo.";
    return { success: false, error: message };
  }
}
