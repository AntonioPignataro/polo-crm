"use server";

import { prisma } from "@/lib/prisma";
import { requireMonitor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import {
  loanWithBookDataSchema,
  type LoanWithBookDataInput,
} from "../schemas/book-schema";

export async function loanBookWithSearch(
  input: LoanWithBookDataInput
): Promise<ActionResult<{ loanId: string; bookTitle: string; created: boolean }>> {
  try {
    const session = await requireMonitor();

    const parsed = loanWithBookDataSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const { memberId, ...bookData } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Try to find existing book by ISBN (if provided)
      let book = bookData.isbn
        ? await tx.book.findFirst({
            where: {
              clubId: session.clubId,
              isbn: bookData.isbn,
            },
          })
        : null;

      // 2. If no ISBN match, try by exact title (case-insensitive)
      if (!book) {
        book = await tx.book.findFirst({
          where: {
            clubId: session.clubId,
            title: { equals: bookData.title, mode: "insensitive" },
          },
        });
      }

      // 3. If found but already loaned, error
      if (book && book.status === "EMPRESTADO") {
        throw new Error("Este livro já está emprestado.");
      }

      // 4. If not found, create new book
      let created = false;
      if (!book) {
        book = await tx.book.create({
          data: {
            clubId: session.clubId,
            title: bookData.title,
            subtitle: bookData.subtitle ?? null,
            author: bookData.author ?? null,
            isbn: bookData.isbn ?? null,
            publisher: bookData.publisher ?? null,
            category: bookData.category ?? null,
            publishedDate: bookData.publishedDate ?? null,
            pageCount: bookData.pageCount ?? null,
            language: bookData.language ?? null,
            coverUrl: bookData.coverUrl ?? null,
          },
        });
        created = true;
      }

      // 5. Validate member
      const member = await tx.member.findFirst({
        where: {
          id: memberId,
          clubId: session.clubId,
          status: "ATIVO",
        },
      });

      if (!member) {
        throw new Error("Sócio não encontrado ou inativo.");
      }

      // 6. Create loan + update book status
      const loan = await tx.bookLoan.create({
        data: {
          bookId: book.id,
          memberId,
          checkoutDate: new Date(),
          registeredBy: session.userId,
        },
      });

      await tx.book.update({
        where: { id: book.id },
        data: { status: "EMPRESTADO" },
      });

      return { loanId: loan.id, bookTitle: book.title, created };
    });

    revalidatePath("/biblioteca");
    return { success: true, data: result };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao emprestar livro.";
    return { success: false, error: message };
  }
}
