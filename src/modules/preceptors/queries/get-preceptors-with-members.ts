"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";
import type { GroupType, ModuleType } from "@/types";

export interface PreceptorMember {
  id: string;
  fullName: string;
  groupType: GroupType;
  modules: ModuleType[];
}

export interface PreceptorWithMembers {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  members: PreceptorMember[];
}

export async function getPreceptorsWithMembers(): Promise<
  PreceptorWithMembers[]
> {
  const session = await getRequiredSession();

  const preceptors = await prisma.user.findMany({
    where: {
      clubId: session.clubId,
      role: { in: ["PRECEPTOR", "DIRETOR"] },
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      preceptoredMembers: {
        where: {
          status: "ATIVO",
        },
        select: {
          id: true,
          fullName: true,
          groupType: true,
          modules: {
            select: { moduleType: true },
          },
        },
        orderBy: { fullName: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return preceptors.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    members: p.preceptoredMembers.map((m) => ({
      id: m.id,
      fullName: m.fullName,
      groupType: m.groupType as GroupType,
      modules: m.modules.map((mod) => mod.moduleType as ModuleType),
    })),
  }));
}
