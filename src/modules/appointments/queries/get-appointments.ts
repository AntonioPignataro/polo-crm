"use server";

import { prisma } from "@/lib/prisma";
import { requireMonitor } from "@/lib/auth-utils";
import type { AppointmentType } from "@/types";

export interface AppointmentItem {
  id: string;
  date: string;
  socio: string;
  tipo: AppointmentType;
  realizadoPor: string;
  preceptor: string | null;
  hasContent: boolean;
}

export async function getAppointments(
  filterTipo?: AppointmentType | null
): Promise<AppointmentItem[]> {
  const session = await requireMonitor();

  // Build role-based where clause
  type WhereClause = Record<string, unknown>;
  const where: WhereClause = {
    member: { clubId: session.clubId },
  };

  if (session.role === "MONITOR") {
    // MONITORs can only see SACERDOTE appointments
    // If monitor tries to filter by a preceptoria type, return empty
    if (
      filterTipo === "PRECEPTORIA_SOCIO" ||
      filterTipo === "PRECEPTORIA_PAIS"
    ) {
      return [];
    }
    where.type = "SACERDOTE";
  } else if (session.role === "PRECEPTOR") {
    // PRECEPTORs see all SACERDOTE + PRECEPTORIA only for assigned members
    if (filterTipo === "SACERDOTE") {
      where.type = "SACERDOTE";
    } else if (
      filterTipo === "PRECEPTORIA_SOCIO" ||
      filterTipo === "PRECEPTORIA_PAIS"
    ) {
      where.type = filterTipo;
      where.member = { clubId: session.clubId, preceptorId: session.userId };
    } else {
      // No filter ("Todos"): SACERDOTE (all) + PRECEPTORIA (assigned only)
      const [sacerdoteAppts, preceptoriaAppts] = await Promise.all([
        prisma.appointment.findMany({
          where: {
            member: { clubId: session.clubId },
            type: "SACERDOTE",
          },
          include: {
            member: { select: { fullName: true, preceptor: { select: { name: true } } } },
            conductor: { select: { name: true } },
          },
          orderBy: { date: "desc" },
        }),
        prisma.appointment.findMany({
          where: {
            member: { clubId: session.clubId, preceptorId: session.userId },
            type: { in: ["PRECEPTORIA_SOCIO", "PRECEPTORIA_PAIS"] },
          },
          include: {
            member: { select: { fullName: true, preceptor: { select: { name: true } } } },
            conductor: { select: { name: true } },
          },
          orderBy: { date: "desc" },
        }),
      ]);

      const all = [...sacerdoteAppts, ...preceptoriaAppts].sort(
        (a, b) => b.date.getTime() - a.date.getTime()
      );

      return all.map((a) => ({
        id: a.id,
        date: a.date.toISOString().split("T")[0],
        socio: a.member.fullName,
        preceptor: a.member.preceptor?.name ?? null,
        tipo: a.type,
        realizadoPor: a.type === "SACERDOTE" ? "Sacerdote" : a.conductor.name,
        hasContent: !!a.notes,
      }));
    }
  } else {
    // DIRETOR / SUPER_ADMIN: see everything
    if (filterTipo) {
      where.type = filterTipo;
    }
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      member: { select: { fullName: true, preceptor: { select: { name: true } } } },
      conductor: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  return appointments.map((a) => ({
    id: a.id,
    date: a.date.toISOString().split("T")[0],
    socio: a.member.fullName,
    preceptor: a.member.preceptor?.name ?? null,
    tipo: a.type,
    realizadoPor: a.type === "SACERDOTE" ? "Sacerdote" : a.conductor.name,
    hasContent: !!a.notes,
  }));
}
