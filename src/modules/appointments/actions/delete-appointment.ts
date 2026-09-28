"use server";

import { prisma } from "@/lib/prisma";
import { requirePreceptor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

/**
 * Permanently deletes an appointment.
 *
 * Permission mirrors {@link ./update-appointment.ts}: PRECEPTORs can only
 * delete their own appointments; DIRETOR/SUPER_ADMIN can delete any
 * appointment in their club.
 *
 * Appointments are leaf records (no FK children), so the delete is a single
 * row removal — no cascade side-effects.
 */
export async function deleteAppointment(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requirePreceptor();

    if (!id || typeof id !== "string") {
      return { success: false, error: "ID do atendimento é obrigatório." };
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      select: {
        conductedBy: true,
        member: { select: { clubId: true } },
      },
    });

    if (!appointment) {
      return { success: false, error: "Atendimento não encontrado." };
    }

    if (appointment.member.clubId !== session.clubId) {
      return {
        success: false,
        error: "Atendimento não pertence ao seu clube.",
      };
    }

    if (
      session.role === "PRECEPTOR" &&
      appointment.conductedBy !== session.userId
    ) {
      return {
        success: false,
        error: "Você só pode excluir atendimentos realizados por você.",
      };
    }

    await prisma.appointment.delete({ where: { id } });

    revalidatePath("/atendimentos");
    return { success: true, data: { id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao excluir atendimento.";
    return { success: false, error: message };
  }
}
