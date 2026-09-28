"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";

export interface SocioStudyHours {
  memberId: string;
  name: string;
  weeks: number[];
  total: number;
}

export interface BimesterStudyData {
  label: string;
  value: string;
  socios: SocioStudyHours[];
}

export async function getStudyHours(
  year: number
): Promise<BimesterStudyData[]> {
  const session = await getRequiredSession();

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
        member: {
          clubId: session.clubId,
          status: "ATIVO",
          groupType: { not: "G3" },
        },
        weekStart: { gte: startDate, lte: endDate },
      },
      include: {
        member: { select: { id: true, fullName: true } },
      },
      orderBy: { weekStart: "asc" },
    });

    // Group by member
    const memberMap = new Map<
      string,
      { name: string; hoursMap: Map<string, number> }
    >();

    for (const sh of studyHours) {
      let entry = memberMap.get(sh.memberId);
      if (!entry) {
        entry = { name: sh.member.fullName, hoursMap: new Map() };
        memberMap.set(sh.memberId, entry);
      }
      const weekKey = sh.weekStart.toISOString().split("T")[0];
      entry.hoursMap.set(weekKey, Number(sh.hours));
    }

    // Get all unique weeks sorted
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

    // Sort by total descending
    socios.sort((a, b) => b.total - a.total);

    results.push({ label: bim.label, value: bim.value, socios });
  }

  return results;
}
