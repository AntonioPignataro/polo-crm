"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";
import { excludeFromPolaresFilter } from "@/lib/constants";

export interface DashboardData {
  totalActiveMembers: number;
  totalMembers: number;
  totalBooks: number;
  availableBooks: number;
  topPolarMembers: {
    id: string;
    fullName: string;
    totalPoints: number;
  }[];
  membersByGroup: {
    groupType: string;
    count: number;
  }[];
  membersByModule: {
    module: string;
    count: number;
  }[];
}

export async function getDashboardStats(): Promise<DashboardData> {
  const session = await getRequiredSession();
  const clubId = session.clubId;

  // Run queries in parallel for performance
  const [
    totalActiveMembers,
    totalMembers,
    totalBooks,
    availableBooks,
    membersByGroup,
    membersByModuleRaw,
    polarEntries,
  ] = await Promise.all([
    // Active members count
    prisma.member.count({
      where: { clubId, status: "ATIVO" },
    }),
    // Total members count
    prisma.member.count({
      where: { clubId },
    }),
    // Total books
    prisma.book.count({
      where: { clubId },
    }),
    // Available books
    prisma.book.count({
      where: { clubId, status: "DISPONIVEL" },
    }),
    // Members by group
    prisma.member.groupBy({
      by: ["groupType"],
      where: { clubId, status: "ATIVO" },
      _count: true,
    }),
    // Members by module via junction table
    prisma.memberModule.groupBy({
      by: ["moduleType"],
      where: {
        member: { clubId, status: "ATIVO" },
      },
      _count: true,
    }),
    // Top polar members (aggregate points per member, exclude G3)
    prisma.polarEntry.groupBy({
      by: ["memberId"],
      where: {
        member: { clubId, ...excludeFromPolaresFilter() },
      },
      _sum: { points: true },
      orderBy: { _sum: { points: "desc" } },
      take: 5,
    }),
  ]);

  // Fetch names for top polar members
  let topPolarMembers: DashboardData["topPolarMembers"] = [];
  if (polarEntries.length > 0) {
    const memberIds = polarEntries.map((e) => e.memberId);
    const members = await prisma.member.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, fullName: true },
    });
    const memberMap = new Map(members.map((m) => [m.id, m.fullName]));

    topPolarMembers = polarEntries.map((e) => ({
      id: e.memberId,
      fullName: memberMap.get(e.memberId) ?? "Desconhecido",
      totalPoints: e._sum.points ?? 0,
    }));
  }

  return {
    totalActiveMembers,
    totalMembers,
    totalBooks,
    availableBooks,
    topPolarMembers,
    membersByGroup: membersByGroup.map((g) => ({
      groupType: g.groupType,
      count: g._count,
    })),
    membersByModule: membersByModuleRaw.map((m) => ({
      module: m.moduleType,
      count: m._count,
    })),
  };
}
