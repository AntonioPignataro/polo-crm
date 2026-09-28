"use server";

import { prisma } from "@/lib/prisma";
import { requireMonitor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import {
  updateBookSchema,
  type UpdateBookInput,
} from "../schemas/book-schema";
import type { BookCategory } from "@/types";

export async function updateBook(
  input: UpdateBookInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireMonitor();

    const parsed = updateBookSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const {
      id,
      title,
      author,
      isbn,
      publisher,
      bookCategory,
      synopsis,
      coverUrl,
      recommendations,
    } = parsed.data;

    // Verify book belongs to the user's club. Loan history is preserved.
    const existing = await prisma.book.findUnique({
      where: { id },
      select: { clubId: true },
    });
    if (!existing) {
      return { success: false, error: "Livro não encontrado." };
    }
    if (existing.clubId !== session.clubId) {
      return { success: false, error: "Livro não pertence ao seu clube." };
    }

    await prisma.book.update({
      where: { id },
      data: {
        title,
        author: author || null,
        isbn: isbn || null,
        publisher: publisher || null,
        bookCategory: (bookCategory as BookCategory) || null,
        synopsis: synopsis || null,
        coverUrl: coverUrl || null,
        recommendations: recommendations ?? [],
      },
    });

    revalidatePath("/biblioteca");
    return { success: true, data: { id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao atualizar livro.";
    return { success: false, error: message };
  }
}
