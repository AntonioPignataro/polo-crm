"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";
import type { FormationType } from "@/types";

export interface FormationParticipant {
  id: string;
  name: string;
  /** Monitor-verified attendance. Drives reports + alerts. */
  presente: boolean;
  /** Parent self-RSVP. Informational only. */
  confirmou: boolean;
}

export interface FormationItem {
  id: string;
  nome: string;
  tipo: FormationType;
  data: string;
  descricao: string | null;
  /** Count of monitor-verified attendances. Drives reports + alerts. */
  presentes: number;
  /** Count of parent self-RSVPs. Informational. */
  confirmados: number;
  participantes: FormationParticipant[];
}

export async function getFormations(): Promise<FormationItem[]> {
  const session = await getRequiredSession();

  const formations = await prisma.parentFormation.findMany({
    where: { clubId: session.clubId },
    include: {
      attendance: {
        include: {
          parent: { select: { id: true, fullName: true } },
        },
      },
    },
    orderBy: { date: "desc" },
  });

  return formations.map((f) => {
    const participantes: FormationParticipant[] = f.attendance.map((a) => ({
      id: a.id,
      name: a.parent.fullName,
      presente: a.present,
      confirmou: a.confirmed,
    }));

    const presentes = participantes.filter((p) => p.presente).length;
    const confirmados = participantes.filter((p) => p.confirmou).length;

    return {
      id: f.id,
      nome: f.name,
      tipo: f.type,
      data: f.date.toISOString().split("T")[0],
      descricao: f.description ?? null,
      presentes,
      confirmados,
      participantes,
    };
  });
}
