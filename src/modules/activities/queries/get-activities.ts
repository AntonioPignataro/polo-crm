"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";
import type { ActivityStatus } from "@/types";

export interface ActivityItem {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  status: ActivityStatus;
  totalInscritos: number;
  maxVagas: number | null;
  custoSocio: number | null;
  responsavel: string;
  inscritos: string[];
}

export async function getActivities(): Promise<ActivityItem[]> {
  const session = await getRequiredSession();

  const activities = await prisma.activity.findMany({
    where: { clubId: session.clubId },
    include: {
      creator: { select: { name: true } },
      registrations: {
        select: { participantName: true },
      },
    },
    orderBy: { startDate: "desc" },
  });

  return activities.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    location: null, // Activity model doesn't have location field
    startDate: a.startDate?.toISOString().split("T")[0] ?? null,
    endDate: a.endDate?.toISOString().split("T")[0] ?? null,
    status: a.status,
    totalInscritos: a.registrations.length,
    maxVagas: null, // No max capacity field in schema
    custoSocio: a.costPerPerson ? Number(a.costPerPerson) : null,
    responsavel: a.creator.name,
    inscritos: a.registrations.map((r) => r.participantName),
  }));
}
