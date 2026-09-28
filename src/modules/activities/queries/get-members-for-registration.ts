"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";

export interface MemberOption {
  id: string;
  fullName: string;
}

export async function getMembersForRegistration(): Promise<MemberOption[]> {
  const session = await getRequiredSession();

  return prisma.member.findMany({
    where: { clubId: session.clubId, status: "ATIVO" },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });
}
