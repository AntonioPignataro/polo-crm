"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";
import type { ParentActivityOption } from "@/modules/activities/queries/get-parent-activity-data";

export interface MonitorActivityData {
  options: ParentActivityOption[];
}

/**
 * Returns registration options for a MONITOR+ user.
 * - Always includes the monitor themselves (type "user")
 * - If the monitor is also a parent, includes their children (type "member")
 *   and, for male parents, includes themselves as parent option too.
 *   For female parents, includes the father/male guardian.
 */
export async function getMonitorActivityData(): Promise<MonitorActivityData> {
  const session = await getRequiredSession();
  const clubId = session.clubId;

  const options: ParentActivityOption[] = [];

  // Always add the monitor themselves as a "user" option
  options.push({
    type: "user",
    id: session.userId,
    fullName: `${session.name} (eu)`,
  });

  // If the monitor is also a parent, fetch children
  if (session.parentId) {
    const parent = await prisma.parent.findUnique({
      where: { id: session.parentId },
      select: {
        id: true,
        fullName: true,
        relationship: true,
        sex: true,
        memberParents: {
          where: { member: { clubId } },
          select: {
            memberId: true,
            member: {
              select: {
                id: true,
                fullName: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (parent) {
      // Add children (active members) as options
      for (const mp of parent.memberParents) {
        if (mp.member.status === "ATIVO") {
          options.push({
            type: "member",
            id: mp.member.id,
            fullName: mp.member.fullName,
          });
        }
      }

      const isMale =
        parent.relationship === "PAI" ||
        (parent.relationship === "RESPONSAVEL" && parent.sex === "MASCULINO");

      if (!isMale) {
        // Female parent: find the father/male guardian of their children
        const memberIds = parent.memberParents.map((mp) => mp.memberId);

        const otherParents = await prisma.memberParent.findMany({
          where: {
            memberId: { in: memberIds },
            parentId: { not: session.parentId },
          },
          select: {
            parent: {
              select: {
                id: true,
                fullName: true,
                relationship: true,
                sex: true,
              },
            },
          },
        });

        const seen = new Set<string>();
        for (const mp of otherParents) {
          const p = mp.parent;
          if (seen.has(p.id)) continue;
          seen.add(p.id);

          const isOtherMale =
            p.relationship === "PAI" ||
            (p.relationship === "RESPONSAVEL" && p.sex === "MASCULINO");

          if (isOtherMale) {
            options.push({
              type: "parent",
              id: p.id,
              fullName: `${p.fullName} (pai/responsavel)`,
            });
          }
        }
      }
    }
  }

  return { options };
}
