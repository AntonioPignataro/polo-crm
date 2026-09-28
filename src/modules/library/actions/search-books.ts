"use server";

import { requireMonitor, type ActionResult } from "@/lib/auth-utils";
import {
  searchBooksByTitle,
  type GoogleBookData,
} from "@/lib/google-books";
import { searchBooksSchema } from "../schemas/book-schema";

export async function searchBooks(
  input: { query: string }
): Promise<ActionResult<GoogleBookData[]>> {
  try {
    await requireMonitor();

    const parsed = searchBooksSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const results = await searchBooksByTitle(parsed.data.query);
    return { success: true, data: results };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao buscar livros.";
    return { success: false, error: message };
  }
}
