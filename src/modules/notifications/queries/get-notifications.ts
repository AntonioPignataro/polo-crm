"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";
import type { NotificationType } from "@/types";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  channel: string;
  recipientName: string;
  recipientEmail: string;
  sentAt: string | null;
  createdAt: string;
}

export interface NotificationFilters {
  type?: NotificationType;
  sent?: boolean; // true = sent, false = pending
}

export async function getNotifications(
  filters?: NotificationFilters
): Promise<NotificationItem[]> {
  const session = await getRequiredSession();

  const where: Record<string, unknown> = {
    clubId: session.clubId,
  };

  if (filters?.type) {
    where.type = filters.type;
  }

  if (filters?.sent === true) {
    where.sentAt = { not: null };
  } else if (filters?.sent === false) {
    where.sentAt = null;
  }

  const notifications = await prisma.notification.findMany({
    where,
    include: {
      recipient: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    channel: n.channel,
    recipientName: n.recipient.name,
    recipientEmail: n.recipient.email,
    sentAt: n.sentAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  }));
}
