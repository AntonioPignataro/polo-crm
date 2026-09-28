"use server";

import { prisma } from "@/lib/prisma";
import { requireMonitor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import {
  createBookSchema,
  type CreateBookInput,
} from "../schemas/book-schema";
import type { BookCategory } from "@/types";

export async function createBook(
  input: CreateBookInput
): Promise<ActionResult<{ id: string; title: string }>> {
  try {
    const session = await requireMonitor();

    const parsed = createBookSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const {
      title,
      author,
      isbn,
      publisher,
      bookCategory,
      synopsis,
      coverUrl,
      recommendations,
    } = parsed.data;

    const book = await prisma.book.create({
      data: {
        clubId: session.clubId,
        title,
        author: author || null,
        isbn: isbn || null,
        publisher: publisher || null,
        bookCategory: (bookCategory as BookCategory) || null,
        synopsis: synopsis || null,
        coverUrl: coverUrl || null,
        status: "DISPONIVEL",
        recommendations: recommendations ?? [],
      },
    });

    revalidatePath("/biblioteca");
    return { success: true, data: { id: book.id, title: book.title } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao cadastrar livro.";
    return { success: false, error: message };
  }
}
