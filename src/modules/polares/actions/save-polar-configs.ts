"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDiretor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

const configurableCategories = [
  "PRESENCA",
  "PONTUALIDADE",
  "AMIGO",
  "ESPORTE",
  "ENCARGO",
  "MULTA",
  "EXERCICIO",
  "BOLETIM",
  "RESUMO",
  "LIVRO",
] as const;

const configEntrySchema = z.object({
  category: z.enum(configurableCategories, {
    message: "Categoria inválida.",
  }),
  defaultPoints: z.number().int({ message: "Pontos devem ser um número inteiro." }),
});

const savePolarConfigsSchema = z.object({
  configs: z.array(configEntrySchema).min(1, {
    message: "Selecione pelo menos uma configuração.",
  }),
});

export type SavePolarConfigsInput = z.infer<typeof savePolarConfigsSchema>;

/**
 * Saves polar config values (points per activity).
 * Requires DIRETOR role or above.
 * OUTROS_PONTOS is excluded — it uses per-entry custom values.
 */
export async function savePolarConfigs(
  input: SavePolarConfigsInput
): Promise<ActionResult<{ count: number }>> {
  try {
    const session = await requireDiretor();

    const parsed = savePolarConfigsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const { configs } = parsed.data;
    let count = 0;

    for (const config of configs) {
      await prisma.polarConfig.upsert({
        where: {
          clubId_category: {
            clubId: session.clubId,
            category: config.category,
          },
        },
        update: { defaultPoints: config.defaultPoints },
        create: {
          clubId: session.clubId,
          category: config.category,
          defaultPoints: config.defaultPoints,
        },
      });
      count++;
    }

    revalidatePath("/polares");
    return { success: true, data: { count } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao salvar configurações.";
    return { success: false, error: message };
  }
}
