"use server";

import { prisma } from "@/lib/prisma";
import { getParentContext } from "@/lib/auth-utils";
import type { GroupType, ModuleType, MemberStatus } from "@/types";

export interface ParentChild {
  id: string;
  fullName: string;
  groupType: GroupType;
  modules: ModuleType[];
  status: MemberStatus;
  birthDate: string | null;
}

export async function getParentChildren(): Promise<ParentChild[]> {
  const { childrenIds, session } = await getParentContext();

  if (childrenIds.length === 0) return [];

  const members = await prisma.member.findMany({
    where: {
      id: { in: childrenIds },
      clubId: session.clubId,
    },
    select: {
      id: true,
      fullName: true,
      groupType: true,
      modules: { select: { moduleType: true } },
      status: true,
      birthDate: true,
    },
    orderBy: { fullName: "asc" },
  });

  return members.map((m) => ({
    id: m.id,
    fullName: m.fullName,
    groupType: m.groupType,
    modules: m.modules.map((mod) => mod.moduleType),
    status: m.status,
    birthDate: m.birthDate?.toISOString().split("T")[0] ?? null,
  }));
}
