"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getRequiredSession,
  getParentContext,
  type ActionResult,
} from "@/lib/auth-utils";

const STAFF_ROLES = ["SUPER_ADMIN", "DIRETOR", "PRECEPTOR", "MONITOR"];
import { revalidatePath } from "next/cache";

const entrySchema = z.object({
  memberId: z.string().min(1, { message: "ID do sócio é obrigatório." }),
  weekStart: z.string().min(1, { message: "Data da semana é obrigatória." }),
  hours: z.number().min(0, { message: "Horas devem ser >= 0." }),
});

const saveStudyHoursSchema = z.object({
  entries: z.array(entrySchema).min(1, {
    message: "Informe pelo menos uma entrada.",
  }),
});

export type SaveStudyHoursInput = z.infer<typeof saveStudyHoursSchema>;

export async function saveStudyHours(
  input: SaveStudyHoursInput
): Promise<ActionResult<{ count: number }>> {
  try {
    const session = await getRequiredSession();
    const isStaff = STAFF_ROLES.includes(session.role);

    // Must be staff (MONITOR+) or a parent
    if (!isStaff && !session.parentId) {
      return {
        success: false,
        error: "Você não tem permissão para registrar horas de estudo.",
      };
    }

    const parsed = saveStudyHoursSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const { entries } = parsed.data;
    const memberIds = [...new Set(entries.map((e) => e.memberId))];

    // Parents can only register for their own children
    if (!isStaff) {
      const parentCtx = await getParentContext();
      const unauthorized = memberIds.filter(
        (id) => !parentCtx.childrenIds.includes(id)
      );
      if (unauthorized.length > 0) {
        return {
          success: false,
          error: "Você só pode registrar horas de estudo dos seus filhos.",
        };
      }
    }

    // Verify members belong to this club.
    const validMembers = await prisma.member.count({
      where: { id: { in: memberIds }, clubId: session.clubId },
    });
    if (validMembers !== memberIds.length) {
      return {
        success: false,
        error: "Um ou mais sócios não pertencem ao seu clube.",
      };
    }

    // G3 não participa do registro de horas de estudo. Esta regra é
    // independente do sistema de polares — não há mais consideração de
    // `polaresUntil` aqui.
    const excludedG3 = await prisma.member.count({
      where: { id: { in: memberIds }, groupType: "G3" },
    });
    if (excludedG3 > 0) {
      return {
        success: false,
        error: "Sócios do G3 não participam do sistema de horas de estudo.",
      };
    }

    // Upsert each entry (unique on memberId + weekStart)
    let count = 0;
    for (const entry of entries) {
      const weekStart = new Date(entry.weekStart);
      await prisma.studyHour.upsert({
        where: {
          memberId_weekStart: {
            memberId: entry.memberId,
            weekStart,
          },
        },
        update: { hours: entry.hours },
        create: {
          memberId: entry.memberId,
          weekStart,
          hours: entry.hours,
          registeredBy: session.userId,
        },
      });
      count++;
    }

    revalidatePath("/horas-estudo");
    return { success: true, data: { count } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao salvar horas de estudo.";
    return { success: false, error: message };
  }
}
