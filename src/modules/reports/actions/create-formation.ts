"use server";

import { prisma } from "@/lib/prisma";
import { requireDiretor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import {
  createFormationSchema,
  type CreateFormationInput,
} from "@/modules/reports/schemas/formation-schema";

export async function createFormation(
  input: CreateFormationInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireDiretor();

    const parsed = createFormationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const { name, type, date, description } = parsed.data;

    const formation = await prisma.parentFormation.create({
      data: {
        clubId: session.clubId,
        name,
        type,
        date: new Date(date),
        description: description ?? null,
      },
    });

    revalidatePath("/formacao-pais");
    return { success: true, data: { id: formation.id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao criar formação.";
    return { success: false, error: message };
  }
}
