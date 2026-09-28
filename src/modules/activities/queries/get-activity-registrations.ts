"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";

export interface ActivityRegistrationItem {
  id: string;
  participantName: string;
  isExternal: boolean;
  canGiveRide: boolean;
  needsRide: boolean;
  isMember: boolean;
  isParent: boolean;
  isStaff: boolean;
  createdAt: string;
}

export async function getActivityRegistrations(
  activityId: string
): Promise<ActivityRegistrationItem[]> {
  const session = await getRequiredSession();

  // Verify activity belongs to the club
  const activity = await prisma.activity.findFirst({
    where: { id: activityId, clubId: session.clubId },
    select: { id: true },
  });

  if (!activity) return [];

  const registrations = await prisma.activityRegistration.findMany({
    where: { activityId },
    select: {
      id: true,
      participantName: true,
      isExternal: true,
      canGiveRide: true,
      needsRide: true,
      memberId: true,
      parentId: true,
      userId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return registrations.map((r) => ({
    id: r.id,
    participantName: r.participantName,
    isExternal: r.isExternal,
    canGiveRide: r.canGiveRide,
    needsRide: r.needsRide,
    isMember: !!r.memberId,
    isParent: !!r.parentId,
    isStaff: !!r.userId,
    createdAt: r.createdAt.toISOString(),
  }));
}
