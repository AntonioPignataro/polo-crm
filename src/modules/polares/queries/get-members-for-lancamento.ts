"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";
import { excludeFromPolaresFilter } from "@/lib/constants";
import type { GroupType } from "@/types";

export interface MemberForLancamento {
  id: string;
  code: number;
  fullName: string;
  groupType: GroupType;
}

/**
 * Fetches active members for the authenticated user's club,
 * used to populate the lancamento checkbox table.
 */
export async function getMembersForLancamento(): Promise<
  MemberForLancamento[]
> {
  const session = await getRequiredSession();

  const members = await prisma.member.findMany({
    where: {
      clubId: session.clubId,
      status: "ATIVO",
      ...excludeFromPolaresFilter(),
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
