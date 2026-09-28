"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";
import type { GroupType } from "@/types";

export interface AttendanceMember {
  id: string;
  code: number;
  fullName: string;
  groupType: GroupType;
}

export async function getMembersForAttendance(
  dayType: "QUINTA" | "SEXTA" | "SABADO"
): Promise<AttendanceMember[]> {
  const session = await getRequiredSession();

  const members = await prisma.member.findMany({
    where: {
      clubId: session.clubId,
      status: "ATIVO",
      groupType: dayType === "QUINTA" ? "G3" : { not: "G3" },
    },
    select: {
      id: true,
      code: true,
      fullName: true,
      groupType: true,
    },
    orderBy: [{ fullName: "asc" }],
  });

  return members.map((m) => ({
    id: m.id,
    code: m.code,
    fullName: m.fullName,
    groupType: m.groupType,
  }));
}
