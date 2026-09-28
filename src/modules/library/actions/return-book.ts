"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMonitor, type ActionResult } from "@/lib/auth-utils";
import { isExcludedFromPolares } from "@/lib/constants";
import { revalidatePath } from "next/cache";

const returnBookSchema = z.object({
  bookId: z.string().min(1, { message: "ID do livro é obrigatório." }),
  finished: z.boolean().default(false),
});

export async function returnBook(
  input: { bookId: string; finished?: boolean }
): Promise<
  ActionResult<{ bookTitle: string; memberName: string; polarPoints: number }>
> {
  try {
    const session = await requireMonitor();

    const parsed = returnBookSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const { bookId, finished } = parsed.data;

    // Verify the book belongs to this club
    const book = await prisma.book.findFirst({
      where: {
        id: bookId,
        clubId: session.clubId,
      },
    });

    if (!book) {
      return { success: false, error: "Livro não encontrado." };
    }

    if (book.status !== "EMPRESTADO") {
      return { success: false, error: "Este livro não está emprestado." };
    }

    // Find the active loan (returnDate is null)
    const activeLoan = await prisma.bookLoan.findFirst({
      where: {
        bookId,
        returnDate: null,
      },
      include: {
        member: {
          select: {
            id: true,
            fullName: true,
            groupType: true,
            polaresUntil: true,
          },
        },
      },
    });

    if (!activeLoan) {
      return {
        success: false,
        error: "Empréstimo ativo não encontrado para este livro.",
      };
    }

    // Get polar config for LIVRO category, default to 60 points
    const polarConfig = await prisma.polarConfig.findUnique({
      where: {
        clubId_category: {
          clubId: session.clubId,
          category: "LIVRO",
        },
      },
    });

    const polarPoints = polarConfig?.defaultPoints ?? 60;

    const excluded = isExcludedFromPolares(
      activeLoan.member.groupType,
      activeLoan.member.polaresUntil
    );

    // Only award polares if finished=true AND member is not excluded
    const shouldAwardPolares = finished && !excluded;

    // Execute return: update loan, update book status, optionally create polar entry
    await prisma.$transaction(async (tx) => {
      // Set return date and finished status on the loan
      await tx.bookLoan.update({
        where: { id: activeLoan.id },
        data: {
          returnDate: new Date(),
          finished,
        },
      });

      // Update book status back to available
      await tx.book.update({
        where: { id: bookId },
        data: { status: "DISPONIVEL" },
      });

      // Create polar entry only if book was finished and member is not G3
      if (shouldAwardPolares) {
        await tx.polarEntry.create({
          data: {
            memberId: activeLoan.member.id,
            date: new Date(),
            category: "LIVRO",
            points: polarPoints,
            description: `Leitura do livro: ${book.title}`,
            registeredBy: session.userId,
          },
        });
      }
    });

    revalidatePath("/biblioteca");
    return {
      success: true,
      data: {
        bookTitle: book.title,
        memberName: activeLoan.member.fullName,
        polarPoints: shouldAwardPolares ? polarPoints : 0,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao devolver livro.";
    return { success: false, error: message };
  }
}
