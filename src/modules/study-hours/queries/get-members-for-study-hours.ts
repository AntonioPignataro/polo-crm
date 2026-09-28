"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";

export interface StudyHourMemberOption {
  id: string;
  fullName: string;
}

/**
 * Sócios elegíveis para registro de horas de estudo.
 *
 * Regras (independentes do sistema de polares):
 * - Apenas sócios ativos do clube
 * - G3 não participa do registro de horas de estudo
 * - O sócio precisa ter SEXTA entre seus módulos cadastrados — a
 *   atividade do clube ligada a horas de estudo acontece às sextas.
 *   Sócios em SEXTA + outros dias (ex.: SEXTA+SABADO) também passam,
 *   pois o operador `some` casa com qualquer módulo correspondente.
 */
export async function getMembersForStudyHours(): Promise<
  StudyHourMemberOption[]
> {
  const session = await getRequiredSession();

  const members = await prisma.member.findMany({
    where: {
      clubId: session.clubId,
      status: "ATIVO",
      groupType: { not: "G3" },
      modules: { some: { moduleType: "SEXTA" } },
    },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  return members;
}
