"use server";

import { requireMonitor, type ActionResult } from "@/lib/auth-utils";
import {
  searchBooksByTitle,
  searchBooksByIsbn,
  type GoogleBookData,
} from "@/lib/google-books";

export async function searchBooksByTitleAction(
  query: string
): Promise<ActionResult<GoogleBookData[]>> {
  try {
    await requireMonitor();
    if (!query || query.trim().length < 2) {
      return { success: false, error: "Digite pelo menos 2 caracteres." };
    }
    const results = await searchBooksByTitle(query.trim());
    return { success: true, data: results };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao buscar livros.";
    return { success: false, error: message };
  }
}

export async function searchBookByIsbnAction(
  isbn: string
): Promise<ActionResult<GoogleBookData | null>> {
  try {
    await requireMonitor();
    if (!isbn || isbn.trim().length < 10) {
      return { success: false, error: "ISBN deve ter pelo menos 10 caracteres." };
    }
    const result = await searchBooksByIsbn(isbn.trim());
    return { success: true, data: result };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao buscar livro por ISBN.";
    return { success: false, error: message };
  }
}
