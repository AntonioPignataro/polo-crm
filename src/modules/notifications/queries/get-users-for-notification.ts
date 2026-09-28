"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";

export interface NotificationRecipient {
  id: string;
  name: string;
  role: string;
  email: string;
}

export interface NotificationRecipientGroups {
  all: NotificationRecipient[];
  parentsByGroup: Record<string, string[]>;
  parentsByModule: Record<string, string[]>;
  parentsBySextaSabado: string[];
}

export async function getUsersForNotification(): Promise<
  NotificationRecipient[]
> {
  const session = await getRequiredSession();

  const users = await prisma.user.findMany({
    where: { clubId: session.clubId, isActive: true },
    select: { id: true, name: true, role: true, email: true },
    orderBy: { name: "asc" },
  });

  // Collect USUARIO user IDs to check which ones have active children
  const usuarioUsers = users.filter((u) => u.role === "USUARIO");
  const usuarioIds = usuarioUsers.map((u) => u.id);

  // Find which USUARIO users have at least one active child in this club
  const parentsWithActiveChildren = await prisma.parent.findMany({
    where: {
      userId: { in: usuarioIds },
      memberParents: {
        some: {
          member: {
            clubId: session.clubId,
            status: "ATIVO",
          },
        },
      },
    },
    select: { userId: true },
  });

  const activeParentUserIds = new Set(
    parentsWithActiveChildren.map((p) => p.userId).filter(Boolean)
  );

  // Exclude USUARIO users who have no active children
  return users
    .filter((u) => {
      if (u.role === "USUARIO") {
        return activeParentUserIds.has(u.id);
      }
      return true;
    })
    .map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      email: u.email,
    }));
}

/**
 * Get users grouped for quick-select buttons in the notification form.
 */
export async function getUsersForNotificationGrouped(): Promise<NotificationRecipientGroups> {
  const session = await getRequiredSession();

  const allUsers = await getUsersForNotification();

  // Get parent-member-module relationships for the club
  const parentRelations = await prisma.parent.findMany({
    where: {
      userId: { not: null },
      user: {
        clubId: session.clubId,
        isActive: true,
      },
      memberParents: {
        some: {
          member: {
            clubId: session.clubId,
            status: "ATIVO",
          },
        },
      },
    },
    select: {
      userId: true,
      memberParents: {
        where: {
          member: {
            clubId: session.clubId,
            status: "ATIVO",
          },
        },
        select: {
          member: {
            select: {
              groupType: true,
              modules: {
                select: { moduleType: true },
              },
            },
          },
        },
      },
    },
  });

  const parentsByGroup: Record<string, string[]> = {
    G1: [],
    G2: [],
    G3: [],
  };

  const parentsByModule: Record<string, string[]> = {
    QUINTA: [],
    SEXTA: [],
    SABADO: [],
  };

  const parentsBySextaSabadoSet = new Set<string>();

  for (const p of parentRelations) {
    if (!p.userId) continue;

    const groups = new Set<string>();
    const modules = new Set<string>();
    let hasSexta = false;
    let hasSabado = false;

    for (const mp of p.memberParents) {
      groups.add(mp.member.groupType);
      for (const mod of mp.member.modules) {
        modules.add(mod.moduleType);
        if (mod.moduleType === "SEXTA") hasSexta = true;
        if (mod.moduleType === "SABADO") hasSabado = true;
      }
    }

    for (const g of groups) {
      if (parentsByGroup[g]) {
        parentsByGroup[g].push(p.userId);
      }
    }

    for (const m of modules) {
      if (parentsByModule[m]) {
        parentsByModule[m].push(p.userId);
      }
    }

    if (hasSexta && hasSabado) {
      parentsBySextaSabadoSet.add(p.userId);
    }
  }

  return {
    all: allUsers,
    parentsByGroup,
    parentsByModule,
    parentsBySextaSabado: Array.from(parentsBySextaSabadoSet),
  };
}
