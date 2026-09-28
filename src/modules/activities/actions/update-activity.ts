"use server";

import { prisma } from "@/lib/prisma";
import { requirePreceptor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import {
  updateActivitySchema,
  type UpdateActivityInput,
} from "@/modules/activities/schemas/activity-schema";

export async function updateActivity(
  input: UpdateActivityInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requirePreceptor();

    const parsed = updateActivitySchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const { id, name, description, startDate, endDate, costPerPerson, status } =
      parsed.data;

    // Verify activity exists and belongs to the user's club.
    const existing = await prisma.activity.findUnique({
      where: { id },
      select: { clubId: true, createdBy: true },
    });
    if (!existing) {
      return { success: false, error: "Atividade não encontrada." };
    }
    if (existing.clubId !== session.clubId) {
      return {
        success: false,
        error: "Atividade não pertence ao seu clube.",
      };
    }

    // PRECEPTORs can only edit activities they created. DIRETOR/SUPER_ADMIN
    // can edit any activity in the club. Mirrors the appointment edit policy.
    if (
      session.role === "PRECEPTOR" &&
      existing.createdBy !== session.userId
    ) {
      return {
        success: false,
        error: "Você só pode editar atividades criadas por você.",
      };
    }

    const parsedStart = new Date(startDate);
    if (isNaN(parsedStart.getTime())) {
      return { success: false, error: "Data de início inválida." };
    }
    let parsedEnd: Date | null = null;
    if (endDate) {
      const d = new Date(endDate);
      if (isNaN(d.getTime())) {
        return { success: false, error: "Data de fim inválida." };
      }
      parsedEnd = d;
    }

    await prisma.activity.update({
      where: { id },
      data: {
        name,
        description: description ?? null,
        startDate: parsedStart,
        endDate: parsedEnd,
        costPerPerson: costPerPerson ?? null,
        status,
      },
    });

    revalidatePath("/atividades");
    return { success: true, data: { id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao atualizar atividade.";
    return { success: false, error: message };
  }
}
