"use server";

import { prisma } from "@/lib/prisma";
import { requireDiretor } from "@/lib/auth-utils";
import type { GroupType, ModuleType } from "@/types";

export interface InactiveMemberItem {
  id: string;
  code: number;
  fullName: string;
  groupType: GroupType;
  modules: ModuleType[];
  preceptorName: string | null;
  updatedAt: string;
}

export async function getInactiveMembers(): Promise<InactiveMemberItem[]> {
  const session = await requireDiretor();

  const members = await prisma.member.findMany({
    where: {
      clubId: session.clubId,
      status: "INATIVO",
    },
    include: {
      preceptor: {
        select: { name: true },
      },
      modules: {
        select: { moduleType: true },
      },
    },
    orderBy: [{ fullName: "asc" }],
  });

  return members.map((m) => ({
    id: m.id,
    code: m.code,
    fullName: m.fullName,
    groupType: m.groupType,
    modules: m.modules.map((mod) => mod.moduleType),
    preceptorName: m.preceptor?.name ?? null,
    updatedAt: m.updatedAt.toISOString().split("T")[0],
  }));
}
