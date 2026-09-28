"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";
import type { BookCategory, GroupType } from "@/types";

export interface BookListItem {
  id: string;
  code: number;
  title: string;
  author: string | null;
  coverUrl: string | null;
  bookCategory: BookCategory | null;
  synopsis: string | null;
  status: "DISPONIVEL" | "EMPRESTADO";
  borrowedByName: string | null;
  borrowedAt: string | null;
  archivedAt: string | null;
  recommendations: GroupType[];
}

export async function getBooks(): Promise<BookListItem[]> {
  const session = await getRequiredSession();

  const books = await prisma.book.findMany({
    where: {
      clubId: session.clubId,
    },
    include: {
      loans: {
        where: {
          returnDate: null,
        },
        take: 1,
        include: {
          member: {
            select: {
              fullName: true,
            },
          },
        },
      },
    },
    orderBy: [{ code: "asc" }],
  });

  return books.map((book) => {
    const activeLoan = book.loans[0] ?? null;
    return {
      id: book.id,
      code: book.code,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      bookCategory: book.bookCategory,
      synopsis: book.synopsis,
      status: book.status,
      borrowedByName: activeLoan?.member.fullName ?? null,
      borrowedAt: activeLoan
        ? activeLoan.checkoutDate.toISOString().split("T")[0]
        : null,
      archivedAt: book.archivedAt?.toISOString() ?? null,
      recommendations: book.recommendations,
    };
  });
}
