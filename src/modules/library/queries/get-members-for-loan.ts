"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";

export interface MemberForLoan {
  id: string;
  fullName: string;
}

export async function getMembersForLoan(): Promise<MemberForLoan[]> {
  const session = await getRequiredSession();

  const members = await prisma.member.findMany({
    where: {
      clubId: session.clubId,
      status: "ATIVO",
    },
    select: {
      id: true,
      fullName: true,
    },
    orderBy: [{ fullName: "asc" }],
  });

  return members;
}
