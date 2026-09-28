"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";
import { POLAR_DEFAULTS, excludeFromPolaresFilter } from "@/lib/constants";
import type { PolarCategory, GroupType } from "@/types";

export interface RankingItem {
  memberId: string;
  fullName: string;
  groupType: GroupType;
  categoryTotals: Record<PolarCategory, number>;
  total: number;
}

/**
 * Aggregates polar entries by member AND by category, returning ranking data
 * sorted by total descending.
 */
export async function getPolarRanking(): Promise<RankingItem[]> {
  const session = await getRequiredSession();

  // Get all polar entries grouped by memberId + category with sum of points
  const grouped = await prisma.polarEntry.groupBy({
    by: ["memberId", "category"],
    where: {
      member: { clubId: session.clubId, ...excludeFromPolaresFilter() },
    },
    _sum: { points: true },
  });

  // Collect unique member IDs
  const memberIds = [...new Set(grouped.map((g) => g.memberId))];

  if (memberIds.length === 0) {
    return [];
  }

  // Fetch member details
  const members = await prisma.member.findMany({
    where: { id: { in: memberIds } },
    select: { id: true, fullName: true, groupType: true },
  });

  const memberMap = new Map(members.map((m) => [m.id, m]));

  // All polar categories for initializing totals
  const allCategories = Object.keys(POLAR_DEFAULTS) as PolarCategory[];

  // Build ranking per member
  const rankingMap = new Map<string, RankingItem>();

  for (const entry of grouped) {
    let item = rankingMap.get(entry.memberId);

    if (!item) {
      const member = memberMap.get(entry.memberId);
      if (!member) continue;

      // Initialize all categories to 0
      const categoryTotals = {} as Record<PolarCategory, number>;
      for (const cat of allCategories) {
        categoryTotals[cat] = 0;
      }

      item = {
        memberId: entry.memberId,
        fullName: member.fullName,
        groupType: member.groupType,
        categoryTotals,
        total: 0,
      };
      rankingMap.set(entry.memberId, item);
    }

    const points = entry._sum.points ?? 0;
    item.categoryTotals[entry.category] = points;
    item.total += points;
  }

  // Sort by total descending
  const ranking = Array.from(rankingMap.values());
  ranking.sort((a, b) => b.total - a.total);

  return ranking;
}
