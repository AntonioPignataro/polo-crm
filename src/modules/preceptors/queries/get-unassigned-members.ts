"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";

export interface UnassignedMember {
  id: string;
  fullName: string;
}

export async function getUnassignedMembers(): Promise<UnassignedMember[]> {
  const session = await getRequiredSession();

  const members = await prisma.member.findMany({
    where: {
      clubId: session.clubId,
      status: "ATIVO",
      preceptorId: null,
    },
    select: {
      id: true,
      fullName: true,
    },
    orderBy: { fullName: "asc" },
  });

  return members;
}
