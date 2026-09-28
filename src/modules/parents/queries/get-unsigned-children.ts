"use server";

import { prisma } from "@/lib/prisma";
import { parseSignatures } from "@/modules/members/lib/signatures";
import type { GroupType, ModuleType } from "@/types";

export interface UnsignedChild {
  id: string;
  code: number;
  fullName: string;
  birthDate: string;
  groupType: GroupType;
  modules: ModuleType[];
  clubName: string;
}

/**
 * Get the active children linked to a parent that THIS parent has not yet
 * signed. Each registered parent/guardian signs their own signature (keyed by
 * Parent.id), so a child is "unsigned" for this parent when their own entry is
 * missing — regardless of whether the other parent has already signed.
 */
export async function getUnsignedChildren(
  parentId: string,
  clubId: string
): Promise<UnsignedChild[]> {
  const parent = await prisma.parent.findUnique({
    where: { id: parentId },
    select: {
      memberParents: {
        where: {
          member: {
            status: "ATIVO",
            clubId,
          },
        },
        include: {
          member: {
            include: {
              club: { select: { name: true } },
              modules: { select: { moduleType: true } },
            },
          },
        },
      },
    },
  });

  if (!parent) return [];

  const unsigned: UnsignedChild[] = [];

  for (const mp of parent.memberParents) {
    const member = mp.member;

    // Already signed by THIS parent? Skip. (Other parents' signatures don't count.)
    const signatures = parseSignatures(member.enrollmentFormUrl);
    if (signatures[parentId]) {
      continue;
    }

    unsigned.push({
      id: member.id,
      code: member.code,
      fullName: member.fullName,
      birthDate: member.birthDate.toISOString().split("T")[0],
      groupType: member.groupType,
      modules: member.modules.map((m) => m.moduleType),
      clubName: member.club.name,
    });
  }

  return unsigned;
}
