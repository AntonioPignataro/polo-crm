"use server";

import { prisma } from "@/lib/prisma";
import { requireMonitor } from "@/lib/auth-utils";
import type { AppointmentType } from "@/types";

export interface AppointmentDetail {
  id: string;
  date: string;
  socio: string;
  tipo: AppointmentType;
  realizadoPor: string;
  conductedById: string;
  notes: string | null;
  purposes: string | null;
  lifePlan: string | null;
}

export async function getAppointmentDetail(
  id: string
): Promise<AppointmentDetail | null> {
  const session = await requireMonitor();

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      member: { select: { fullName: true, clubId: true, preceptorId: true } },
      conductor: { select: { name: true } },
    },
  });

  if (!appointment || appointment.member.clubId !== session.clubId) {
    return null;
  }

  // RBAC visibility
  const isPreceptoria =
    appointment.type === "PRECEPTORIA_SOCIO" ||
    appointment.type === "PRECEPTORIA_PAIS";

  if (session.role === "MONITOR" && isPreceptoria) {
    return null;
  }

  if (
    session.role === "PRECEPTOR" &&
    isPreceptoria &&
    appointment.member.preceptorId !== session.userId
  ) {
    return null;
  }

  return {
    id: appointment.id,
    date: appointment.date.toISOString().split("T")[0],
    socio: appointment.member.fullName,
    tipo: appointment.type,
    realizadoPor:
      appointment.type === "SACERDOTE"
        ? "Sacerdote"
        : appointment.conductor.name,
    conductedById: appointment.conductedBy,
    notes: appointment.notes,
    purposes: appointment.purposes,
    lifePlan: appointment.lifePlan,
  };
}
