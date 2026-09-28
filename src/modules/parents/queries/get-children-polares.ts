"use server";

import { prisma } from "@/lib/prisma";
import { getParentContext } from "@/lib/auth-utils";
import { POLAR_DEFAULTS, excludeFromPolaresFilter } from "@/lib/constants";
import type { PolarCategory, GroupType } from "@/types";

export interface ChildPolarRanking {
  memberId: string;
  fullName: string;
  groupType: GroupType;
  categoryTotals: Record<PolarCategory, number>;
  total: number;
}

export async function getChildrenPolares(): Promise<ChildPolarRanking[]> {
  const { childrenIds } = await getParentContext();

  if (childrenIds.length === 0) return [];

  const grouped = await prisma.polarEntry.groupBy({
    by: ["memberId", "category"],
    where: {
      memberId: { in: childrenIds },
      member: excludeFromPolaresFilter(),
    },
    _sum: { points: true },
  });

  const memberIds = [...new Set(grouped.map((g) => g.memberId))];

  if (memberIds.length === 0) {
    // Return children with zero polares
    const members = await prisma.member.findMany({
      where: { id: { in: childrenIds }, ...excludeFromPolaresFilter() },
      select: { id: true, fullName: true, groupType: true },
    });

    const allCategories = Object.keys(POLAR_DEFAULTS) as PolarCategory[];
    return members.map((m) => {
      const categoryTotals = {} as Record<PolarCategory, number>;
      for (const cat of allCategories) categoryTotals[cat] = 0;
      return {
        memberId: m.id,
        fullName: m.fullName,
        groupType: m.groupType,
        categoryTotals,
        total: 0,
      };
    });
  }

  const members = await prisma.member.findMany({
    where: { id: { in: childrenIds } },
    select: { id: true, fullName: true, groupType: true },
  });

  const memberMap = new Map(members.map((m) => [m.id, m]));
  const allCategories = Object.keys(POLAR_DEFAULTS) as PolarCategory[];

  const rankingMap = new Map<string, ChildPolarRanking>();

  // Initialize all children (even those with no polares)
  for (const m of members) {
    const categoryTotals = {} as Record<PolarCategory, number>;
    for (const cat of allCategories) categoryTotals[cat] = 0;
    rankingMap.set(m.id, {
      memberId: m.id,
      fullName: m.fullName,
      groupType: m.groupType,
      categoryTotals,
      total: 0,
    });
  }

  for (const entry of grouped) {
    const item = rankingMap.get(entry.memberId);
    if (!item) continue;

    const points = entry._sum.points ?? 0;
    item.categoryTotals[entry.category] = points;
    item.total += points;
  }

  const ranking = Array.from(rankingMap.values());
  ranking.sort((a, b) => b.total - a.total);

  return ranking;
}
