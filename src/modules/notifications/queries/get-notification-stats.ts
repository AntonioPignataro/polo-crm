"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";
import { isEmailConfigured } from "@/lib/email";

export interface NotificationStats {
  total: number;
  sent: number;
  pending: number;
  byType: {
    type: string;
    count: number;
  }[];
  emailConfigured: boolean;
  notificationsPaused: boolean;
  userRole: string;
}

export async function getNotificationStats(): Promise<NotificationStats> {
  const session = await getRequiredSession();

  const [total, sent, byType, club] = await Promise.all([
    prisma.notification.count({
      where: { clubId: session.clubId },
    }),
    prisma.notification.count({
      where: { clubId: session.clubId, sentAt: { not: null } },
    }),
    prisma.notification.groupBy({
      by: ["type"],
      where: { clubId: session.clubId },
      _count: true,
    }),
    prisma.club.findUnique({
      where: { id: session.clubId },
      select: { notificationsPaused: true },
    }),
  ]);

  return {
    total,
    sent,
    pending: total - sent,
    byType: byType.map((b) => ({
      type: b.type,
      count: b._count,
    })),
    emailConfigured: isEmailConfigured(),
    notificationsPaused: club?.notificationsPaused ?? false,
    userRole: session.role,
  };
}
