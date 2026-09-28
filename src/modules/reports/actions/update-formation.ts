"use server";

import { prisma } from "@/lib/prisma";
import { requireDiretor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import {
  updateFormationSchema,
  type UpdateFormationInput,
} from "@/modules/reports/schemas/formation-schema";

export async function updateFormation(
  input: UpdateFormationInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireDiretor();

    const parsed = updateFormationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const { id, name, type, date, description } = parsed.data;

    // Verify formation belongs to the user's club.
    const existing = await prisma.parentFormation.findUnique({
      where: { id },
      select: { clubId: true },
    });
    if (!existing) {
      return { success: false, error: "Formação não encontrada." };
    }
    if (existing.clubId !== session.clubId) {
      return {
        success: false,
        error: "Formação não pertence ao seu clube.",
      };
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return { success: false, error: "Data inválida." };
    }

    await prisma.parentFormation.update({
      where: { id },
      data: {
        name,
        type,
        date: parsedDate,
        description: description ?? null,
      },
    });

    revalidatePath("/formacao-pais");
    return { success: true, data: { id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao atualizar formação.";
    return { success: false, error: message };
  }
}
