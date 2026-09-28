"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";
import type { BookCategory, GroupType } from "@/types";

export interface BookForEdit {
  id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  publisher: string | null;
  bookCategory: BookCategory | null;
  synopsis: string | null;
  coverUrl: string | null;
  archivedAt: string | null;
  recommendations: GroupType[];
}

/**
 * Returns full editable fields for a single book. Scoped to the user's club.
 * Returns null if the book doesn't exist or doesn't belong to the user's club.
 */
export async function getBookForEdit(id: string): Promise<BookForEdit | null> {
  const session = await getRequiredSession();

  const book = await prisma.book.findUnique({
    where: { id },
    select: {
      id: true,
      clubId: true,
      title: true,
      author: true,
      isbn: true,
      publisher: true,
      bookCategory: true,
      synopsis: true,
      coverUrl: true,
      archivedAt: true,
      recommendations: true,
    },
  });

  if (!book || book.clubId !== session.clubId) return null;

  return {
    id: book.id,
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    publisher: book.publisher,
    bookCategory: book.bookCategory,
    synopsis: book.synopsis,
    coverUrl: book.coverUrl,
    archivedAt: book.archivedAt?.toISOString() ?? null,
    recommendations: book.recommendations,
  };
}
