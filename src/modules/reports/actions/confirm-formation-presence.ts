"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequiredSession, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

const confirmSchema = z.object({
  formationId: z.string().min(1),
});

export type ConfirmFormationPresenceInput = z.infer<typeof confirmSchema>;

export async function confirmFormationPresence(
  input: ConfirmFormationPresenceInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await getRequiredSession();

    if (!session.parentId) {
      return {
        success: false,
        error: "Você precisa estar vinculado como pai/responsável.",
      };
    }

    const parsed = confirmSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const { formationId } = parsed.data;

    // Get formation to check type
    const formation = await prisma.parentFormation.findFirst({
      where: { id: formationId, clubId: session.clubId },
      select: { id: true, type: true },
    });

    if (!formation) {
      return { success: false, error: "Formação não encontrada." };
    }

    // Get parent record linked to this user
    const parent = await prisma.parent.findUnique({
      where: { userId: session.userId },
      select: { id: true, relationship: true, sex: true },
    });

    if (!parent) {
      return { success: false, error: "Cadastro de pai/responsável não encontrado." };
    }

    // For FORMACAO_PAI: only male parents can confirm
    if (formation.type === "FORMACAO_PAI") {
      const isMale =
        parent.relationship === "PAI" ||
        (parent.relationship === "RESPONSAVEL" && parent.sex === "MASCULINO");

      if (!isMale) {
        return {
          success: false,
          error: "Apenas pais (homens) podem confirmar presença na Formação Pai.",
        };
      }
    }

    // Parent RSVP — sets `confirmed=true` only. Actual attendance (`present`)
    // is set later by a MONITOR+ via mark-formation-attendance after the
    // formation happens.
    const existing = await prisma.parentFormationAttendance.findFirst({
      where: { formationId, parentId: parent.id },
    });

    if (existing?.confirmed) {
      return {
        success: false,
        error: "Você já confirmou presença nesta formação.",
      };
    }

    const attendance = await prisma.parentFormationAttendance.upsert({
      where: {
        formationId_parentId: { formationId, parentId: parent.id },
      },
      create: {
        formationId,
        parentId: parent.id,
        confirmed: true,
        // present defaults to false — monitor will fill in after the fact.
      },
      update: {
        confirmed: true,
        // Don't touch `present` — preserve any monitor-set value.
      },
    });

    revalidatePath("/formacao-pais");
    return { success: true, data: { id: attendance.id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao confirmar presença.";
    return { success: false, error: message };
  }
}
