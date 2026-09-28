"use server";

import { prisma } from "@/lib/prisma";
import { requireMonitor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import {
  createAppointmentSchema,
  type CreateAppointmentInput,
} from "@/modules/appointments/schemas/appointment-schema";
import type { AppointmentType } from "@/types";

export async function createAppointment(
  input: CreateAppointmentInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireMonitor();

    const parsed = createAppointmentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const { memberId, date, type, notes, purposes, lifePlan } = parsed.data;
    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) {
      return { success: false, error: "Data inválida." };
    }

    const member = await prisma.member.findFirst({
      where: { id: memberId, clubId: session.clubId },
      select: { id: true, preceptorId: true },
    });

    if (!member) {
      return { success: false, error: "Sócio não encontrado no seu clube." };
    }

    // Role-based access control for preceptoria types
    const isPreceptoria =
      type === "PRECEPTORIA_SOCIO" || type === "PRECEPTORIA_PAIS";

    if (isPreceptoria) {
      if (session.role === "MONITOR") {
        return {
          success: false,
          error: "Monitores não podem registrar preceptorias.",
        };
      }

      if (
        session.role === "PRECEPTOR" &&
        member.preceptorId !== session.userId
      ) {
        return {
          success: false,
          error:
            "Você só pode registrar preceptorias para sócios atribuídos a você.",
        };
      }
    }

    const isSacerdote = type === "SACERDOTE";

    const appointment = await prisma.appointment.create({
      data: {
        memberId,
        date: parsedDate,
        type: type as AppointmentType,
        notes: isSacerdote ? null : (notes ?? null),
        purposes: isPreceptoria ? (purposes ?? null) : null,
        lifePlan: isPreceptoria ? (lifePlan ?? null) : null,
        conductedBy: session.userId,
      },
    });

    revalidatePath("/atendimentos");
    return { success: true, data: { id: appointment.id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao criar atendimento.";
    return { success: false, error: message };
  }
}
