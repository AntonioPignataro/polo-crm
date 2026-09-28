"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";

export interface ParentActivityOption {
  type: "member" | "parent" | "user";
  id: string;
  fullName: string;
}

export interface ParentActivityData {
  parentSex: "MASCULINO" | "FEMININO" | null;
  parentRelationship: string;
  options: ParentActivityOption[];
}

/**
 * Returns the parent's children and, if the parent is female,
 * also returns the father/male guardian of those children.
 * If the parent is male, returns themselves as an option too.
 */
export async function getParentActivityData(
  parentId: string
): Promise<ParentActivityData> {
  const session = await getRequiredSession();
  const clubId = session.clubId;

  // Get the parent's info
  const parent = await prisma.parent.findUnique({
    where: { id: parentId },
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

  if (!parent) {
    return { parentSex: null, parentRelationship: "", options: [] };
  }

  const isMale =
    parent.relationship === "PAI" ||
    (parent.relationship === "RESPONSAVEL" && parent.sex === "MASCULINO");

  const options: ParentActivityOption[] = [];

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

  // Get the member IDs linked to this parent
  const memberIds = parent.memberParents.map((mp) => mp.memberId);

  if (isMale) {
    // Male parent can register themselves
    options.push({
      type: "parent",
      id: parent.id,
      fullName: `${parent.fullName} (pai/responsavel)`,
    });
  } else {
    // Female parent: find the father/male guardian of their children
    const otherParents = await prisma.memberParent.findMany({
      where: {
        memberId: { in: memberIds },
        parentId: { not: parentId },
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

    // Deduplicate and filter for male parents only
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

  return {
    parentSex: parent.sex,
    parentRelationship: parent.relationship,
    options,
  };
}
