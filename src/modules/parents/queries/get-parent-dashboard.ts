"use server";

import { prisma } from "@/lib/prisma";
import { getParentContext } from "@/lib/auth-utils";
import { excludeFromPolaresFilter } from "@/lib/constants";
import type { GroupType, ModuleType, MemberStatus } from "@/types";

export interface ParentDashboardChild {
  id: string;
  fullName: string;
  groupType: GroupType;
  modules: ModuleType[];
  status: MemberStatus;
  totalPolares: number;
  totalStudyHours: number;
  upcomingActivities: number;
}

export interface ParentDashboardData {
  parentName: string;
  children: ParentDashboardChild[];
  upcomingEvents: {
    id: string;
    title: string;
    date: string;
    type: string;
  }[];
}

export async function getParentDashboard(): Promise<ParentDashboardData> {
  const { childrenIds, session, parentId } = await getParentContext();

  // Get parent name
  const parent = await prisma.parent.findUnique({
    where: { id: parentId },
    select: { fullName: true },
  });

  if (childrenIds.length === 0) {
    return {
      parentName: parent?.fullName ?? session.name,
      children: [],
      upcomingEvents: [],
    };
  }

  // Fetch children details, polares, study hours, activities in parallel
  const [members, polarTotals, studyTotals, activityCounts, upcomingEvents] =
    await Promise.all([
      // Children details
      prisma.member.findMany({
        where: { id: { in: childrenIds }, clubId: session.clubId },
        select: {
          id: true,
          fullName: true,
          groupType: true,
          modules: { select: { moduleType: true } },
          status: true,
        },
      }),
      // Polar totals per child (exclude G3)
      prisma.polarEntry.groupBy({
        by: ["memberId"],
        where: {
          memberId: { in: childrenIds },
          member: excludeFromPolaresFilter(),
        },
        _sum: { points: true },
      }),
      // Study hours totals per child (current year)
      prisma.studyHour.groupBy({
        by: ["memberId"],
        where: {
          memberId: { in: childrenIds },
          weekStart: {
            gte: new Date(new Date().getFullYear(), 0, 1),
          },
        },
        _sum: { hours: true },
      }),
      // Upcoming activity registrations per child
      prisma.activityRegistration.groupBy({
        by: ["memberId"],
        where: {
          memberId: { in: childrenIds },
          activity: {
            status: { in: ["INSCRICOES_ABERTAS", "INSCRICOES_ENCERRADAS", "PLANEJADA"] },
          },
        },
        _count: true,
      }),
      // Upcoming club events
      prisma.calendarEvent.findMany({
        where: {
          clubId: session.clubId,
          date: { gte: new Date() },
        },
        select: {
          id: true,
          title: true,
          date: true,
          eventType: true,
        },
        orderBy: { date: "asc" },
        take: 5,
      }),
    ]);

  const polarMap = new Map(
    polarTotals.map((p) => [p.memberId, p._sum.points ?? 0])
  );
  const studyMap = new Map(
    studyTotals.map((s) => [s.memberId, Number(s._sum.hours ?? 0)])
  );
  const activityMap = new Map(
    activityCounts.map((a) => [a.memberId, a._count])
  );

  const children: ParentDashboardChild[] = members.map((m) => ({
    id: m.id,
    fullName: m.fullName,
    groupType: m.groupType,
    modules: m.modules.map((mod) => mod.moduleType),
    status: m.status,
    totalPolares: polarMap.get(m.id) ?? 0,
    totalStudyHours: studyMap.get(m.id) ?? 0,
    upcomingActivities: activityMap.get(m.id) ?? 0,
  }));

  return {
    parentName: parent?.fullName ?? session.name,
    children,
    upcomingEvents: upcomingEvents.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date.toISOString().split("T")[0],
      type: e.eventType,
    })),
  };
}
