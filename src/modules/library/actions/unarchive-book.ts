"use server";

import { prisma } from "@/lib/prisma";
import { requireMonitor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

/**
 * Restores a previously archived book back into the acervo.
 *
 * Sets `archivedAt` back to NULL, so the library list shows the book again
 * and it becomes loanable. Inverse of {@link ./archive-book.ts}.
 */
export async function unarchiveBook(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireMonitor();

    if (!id || typeof id !== "string") {
      return { success: false, error: "ID do livro é obrigatório." };
    }

    const existing = await prisma.book.findUnique({
      where: { id },
      select: { clubId: true, archivedAt: true },
    });

    if (!existing) {
      return { success: false, error: "Livro não encontrado." };
    }
    if (existing.clubId !== session.clubId) {
      return { success: false, error: "Livro não pertence ao seu clube." };
    }
    if (!existing.archivedAt) {
      return {
        success: false,
        error: "Este livro já está no acervo.",
      };
    }

    await prisma.book.update({
      where: { id },
      data: { archivedAt: null },
    });

    revalidatePath("/biblioteca");
    return { success: true, data: { id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao restaurar livro.";
    return { success: false, error: message };
  }
}
