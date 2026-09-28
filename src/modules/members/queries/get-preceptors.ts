"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";

export interface PreceptorOption {
  id: string;
  name: string;
}

export async function getPreceptors(): Promise<PreceptorOption[]> {
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
    },
    orderBy: { name: "asc" },
  });

  return preceptors;
}
