"use server";

import { prisma } from "@/lib/prisma";
import { requireMonitor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

/**
 * Soft-deletes a book ("removes from acervo").
 *
 * The book record stays in the database — only `archivedAt` is set, so the
 * library list filters it out and the loan flow refuses to lend it. Past
 * loans continue to reference the book row, so reports like Histórico de
 * Leitura keep rendering correctly.
 *
 * Reversible via {@link ./unarchive-book.ts}.
 */
export async function archiveBook(
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
    if (existing.archivedAt) {
      return {
        success: false,
        error: "Este livro já foi removido do acervo.",
      };
    }

    await prisma.book.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    revalidatePath("/biblioteca");
    return { success: true, data: { id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao arquivar livro.";
    return { success: false, error: message };
  }
}
