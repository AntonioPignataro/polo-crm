import { z } from "zod";

export const searchBooksSchema = z.object({
  query: z.string().min(2, "Digite pelo menos 2 caracteres para buscar."),
});

export const loanWithBookDataSchema = z.object({
  memberId: z.string().min(1, "Selecione um sócio."),
  title: z.string().min(1, "Título é obrigatório."),
  subtitle: z.string().nullable().optional(),
  author: z.string().nullable().optional(),
  isbn: z.string().nullable().optional(),
  publisher: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  publishedDate: z.string().nullable().optional(),
  pageCount: z.number().int().positive().nullable().optional(),
  language: z.string().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
});

export const groupTypeValues = ["G1", "G2", "G3"] as const;

export const createBookSchema = z.object({
  title: z.string().min(1, "Título é obrigatório."),
  author: z.string().optional(),
  isbn: z.string().optional(),
  publisher: z.string().optional(),
  bookCategory: z
    .enum(["LITERATURA", "LEITURA_ESPIRITUAL", "FORMACAO_HUMANA"])
    .optional(),
  synopsis: z.string().optional(),
  coverUrl: z.string().optional(),
  recommendations: z.array(z.enum(groupTypeValues)).optional(),
});

export const updateBookSchema = z.object({
  id: z.string().min(1, "ID do livro é obrigatório."),
  title: z.string().min(1, "Título é obrigatório."),
  author: z.string().optional(),
  isbn: z.string().optional(),
  publisher: z.string().optional(),
  bookCategory: z
    .enum(["LITERATURA", "LEITURA_ESPIRITUAL", "FORMACAO_HUMANA"])
    .optional(),
  synopsis: z.string().optional(),
  coverUrl: z.string().optional(),
  recommendations: z.array(z.enum(groupTypeValues)).optional(),
});

export type SearchBooksInput = z.infer<typeof searchBooksSchema>;
export type LoanWithBookDataInput = z.infer<typeof loanWithBookDataSchema>;
export type CreateBookInput = z.infer<typeof createBookSchema>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;
