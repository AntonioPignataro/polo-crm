import type { PolarCategory } from "@/types";

/**
 * Categories shown as checkboxes in the Lançamento tab.
 * Saving these REPLACES existing entries for the same (member, date, category)
 * within the loaded member set — mirrors the attendance screen behavior.
 */
export const CHECKBOX_LANCAMENTO_CATEGORIES = [
  "AMIGO",
  "ESPORTE",
  "ENCARGO",
  "MULTA",
  "EXERCICIO",
  "BOLETIM",
  "RESUMO",
] as const satisfies readonly PolarCategory[];

/**
 * Categories shown as free-numeric inputs in the Lançamento tab.
 * Saving these APPENDS new entries (additive history).
 */
export const ADDITIVE_LANCAMENTO_CATEGORIES = [
  "OUTROS_PONTOS",
] as const satisfies readonly PolarCategory[];

/** All categories editable from the Lançamento tab. */
export const LANCAMENTO_CATEGORIES = [
  ...CHECKBOX_LANCAMENTO_CATEGORIES,
  ...ADDITIVE_LANCAMENTO_CATEGORIES,
] as const satisfies readonly PolarCategory[];
