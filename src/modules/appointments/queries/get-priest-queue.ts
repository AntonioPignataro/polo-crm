"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";

export interface QueueMember {
  id: string;
  memberId: string;
  name: string;
  position: number;
  solicitadoEm: string;
}

export async function getPriestQueue(): Promise<QueueMember[]> {
  const session = await getRequiredSession();

  const queue = await prisma.priestQueue.findMany({
    where: {
      attended: false,
      member: { clubId: session.clubId },
    },
    include: {
      member: { select: { fullName: true } },
      session: { select: { date: true } },
    },
    orderBy: { position: "asc" },
  });

  return queue.map((q) => ({
    id: q.id,
    memberId: q.memberId,
    name: q.member.fullName,
    position: q.position,
    solicitadoEm: q.session.date.toISOString().split("T")[0],
  }));
}
