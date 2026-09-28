"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMonitor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

const loanBookSchema = z.object({
  bookId: z.string().min(1, { message: "ID do livro é obrigatório." }),
  memberId: z.string().min(1, { message: "ID do sócio é obrigatório." }),
});

export async function loanBook(
  input: { bookId: string; memberId: string }
): Promise<ActionResult<{ loanId: string }>> {
  try {
    const session = await requireMonitor();

    const parsed = loanBookSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const { bookId, memberId } = parsed.data;

    // All checks and mutations inside the transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      const book = await tx.book.findFirst({
        where: {
          id: bookId,
          clubId: session.clubId,
        },
      });

      if (!book) {
        throw new Error("Livro não encontrado.");
      }

      if (book.archivedAt) {
        throw new Error(
          "Este livro foi removido do acervo e não pode ser emprestado."
        );
      }

      if (book.status === "EMPRESTADO") {
        throw new Error("Este livro já está emprestado.");
      }

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

      const loan = await tx.bookLoan.create({
        data: {
          bookId,
          memberId,
          checkoutDate: new Date(),
          registeredBy: session.userId,
        },
      });

      await tx.book.update({
        where: { id: bookId },
        data: { status: "EMPRESTADO" },
      });

      return loan;
    });

    revalidatePath("/biblioteca");
    return { success: true, data: { loanId: result.id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao emprestar livro.";
    return { success: false, error: message };
  }
}
