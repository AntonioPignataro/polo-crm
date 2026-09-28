"use server";

import { prisma } from "@/lib/prisma";
import { getParentContext } from "@/lib/auth-utils";
import type { BimesterStudyData, SocioStudyHours } from "@/modules/study-hours/queries/get-study-hours";

export async function getChildrenStudyHours(
  year: number
): Promise<BimesterStudyData[]> {
  const { childrenIds } = await getParentContext();

  if (childrenIds.length === 0) return [];

  const bimesters = [
    { label: "Mar/Abr", value: "mar-abr", startMonth: 3, endMonth: 4 },
    { label: "Mai/Jun", value: "mai-jun", startMonth: 5, endMonth: 6 },
    { label: "Ago/Set", value: "ago-set", startMonth: 8, endMonth: 9 },
    { label: "Out/Nov", value: "out-nov", startMonth: 10, endMonth: 11 },
  ];

  const results: BimesterStudyData[] = [];

  for (const bim of bimesters) {
    const startDate = new Date(year, bim.startMonth - 1, 1);
    const endDate = new Date(year, bim.endMonth, 0);

    const studyHours = await prisma.studyHour.findMany({
      where: {
        memberId: { in: childrenIds },
        weekStart: { gte: startDate, lte: endDate },
      },
      include: {
        member: { select: { id: true, fullName: true } },
      },
      orderBy: { weekStart: "asc" },
    });

    const memberMap = new Map<
      string,
      { name: string; hoursMap: Map<string, number> }
    >();

    // Initialize all children even if no hours recorded
    const allChildren = await prisma.member.findMany({
      where: { id: { in: childrenIds } },
      select: { id: true, fullName: true },
    });

    for (const child of allChildren) {
      memberMap.set(child.id, {
        name: child.fullName,
        hoursMap: new Map(),
      });
    }

    for (const sh of studyHours) {
      let entry = memberMap.get(sh.memberId);
      if (!entry) {
        entry = { name: sh.member.fullName, hoursMap: new Map() };
        memberMap.set(sh.memberId, entry);
      }
      const weekKey = sh.weekStart.toISOString().split("T")[0];
      entry.hoursMap.set(weekKey, Number(sh.hours));
    }

    const allWeeks = [
      ...new Set(studyHours.map((sh) => sh.weekStart.toISOString().split("T")[0])),
    ].sort();

    const socios: SocioStudyHours[] = Array.from(memberMap.entries()).map(
      ([memberId, entry]) => {
        const weeks = allWeeks.map((w) => entry.hoursMap.get(w) ?? 0);
        const total = weeks.reduce((acc, h) => acc + h, 0);
        return { memberId, name: entry.name, weeks, total };
      }
    );

    socios.sort((a, b) => b.total - a.total);

    results.push({ label: bim.label, value: bim.value, socios });
  }

  return results;
}
