"use server";

import { prisma } from "@/lib/prisma";
import { requireMonitor } from "@/lib/auth-utils";

export interface MemberOption {
  id: string;
  fullName: string;
}

export interface AppointmentMembersData {
  allMembers: MemberOption[];
  assignedMembers: MemberOption[];
  userRole: string;
  userId: string;
}

export async function getMembersForAppointment(): Promise<AppointmentMembersData> {
  const session = await requireMonitor();

  // DIRETOR / SUPER_ADMIN: return all active members
  // PRECEPTOR: allMembers = all (for SACERDOTE type), assignedMembers = only their preceptorados (for PRECEPTORIA types)
  // MONITOR: allMembers = all (for SACERDOTE type only, PRECEPTORIA not available to them)

  const allMembers = await prisma.member.findMany({
    where: { clubId: session.clubId, status: "ATIVO" },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  // For PRECEPTORs, also get only their assigned members
  let assignedMembers: MemberOption[] = [];
  if (session.role === "PRECEPTOR") {
    assignedMembers = await prisma.member.findMany({
      where: {
        clubId: session.clubId,
        status: "ATIVO",
        preceptorId: session.userId,
      },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    });
  }

  return {
    allMembers,
    assignedMembers,
    userRole: session.role,
    userId: session.userId,
  };
}
