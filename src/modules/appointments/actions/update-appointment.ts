"use server";

import { prisma } from "@/lib/prisma";
import { requirePreceptor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import {
  updateAppointmentSchema,
  type UpdateAppointmentInput,
} from "@/modules/appointments/schemas/appointment-schema";

export async function updateAppointment(
  input: UpdateAppointmentInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requirePreceptor();

    const parsed = updateAppointmentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const { id, date, notes, purposes, lifePlan } = parsed.data;

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return { success: false, error: "Data inválida." };
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      select: {
        type: true,
        conductedBy: true,
        member: { select: { clubId: true } },
      },
    });

    if (!appointment) {
      return { success: false, error: "Atendimento não encontrado." };
    }

    if (appointment.member.clubId !== session.clubId) {
      return { success: false, error: "Atendimento não pertence ao seu clube." };
    }

    // PRECEPTORs can only edit their own appointments
    if (
      session.role === "PRECEPTOR" &&
      appointment.conductedBy !== session.userId
    ) {
      return {
        success: false,
        error: "Você só pode editar atendimentos realizados por você.",
      };
    }

    const isPreceptoria =
      appointment.type === "PRECEPTORIA_SOCIO" ||
      appointment.type === "PRECEPTORIA_PAIS";
    const isSacerdote = appointment.type === "SACERDOTE";

    await prisma.appointment.update({
      where: { id },
      data: {
        date: parsedDate,
        notes: isSacerdote ? undefined : (notes ?? undefined),
        purposes: isPreceptoria ? (purposes ?? undefined) : undefined,
        lifePlan: isPreceptoria ? (lifePlan ?? undefined) : undefined,
      },
    });

    revalidatePath("/atendimentos");
    return { success: true, data: { id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao atualizar atendimento.";
    return { success: false, error: message };
  }
}
