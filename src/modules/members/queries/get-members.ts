"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";
import type { GroupType, ModuleType, MemberStatus } from "@/types";
import {
  parseSignatures,
  buildSigners,
  statusFromSigners,
  type SignerInfo,
  type SignatureStatus,
} from "@/modules/members/lib/signatures";

export interface MemberListItem {
  id: string;
  code: number;
  fullName: string;
  groupType: GroupType;
  modules: ModuleType[];
  status: MemberStatus;
  preceptorName: string | null;
  birthDate: string;
  /** Per-parent signature completion (each account-linked parent must sign). */
  signatureStatus: SignatureStatus;
  /** The required signers + who has signed, for the signature dialog. */
  signers: SignerInfo[];
  enrollmentFormUrl: string | null;
}

export interface GetMembersFilters {
  search?: string;
  groupType?: GroupType | null;
  module?: ModuleType | null;
  status?: MemberStatus | null;
}

export async function getMembers(
  filters: GetMembersFilters = {}
): Promise<MemberListItem[]> {
  const session = await getRequiredSession();

  const where: Record<string, unknown> = {
    clubId: session.clubId,
  };

  if (filters.groupType) {
    where.groupType = filters.groupType;
  }

  // Filter by module via junction table
  if (filters.module) {
    where.modules = {
      some: { moduleType: filters.module },
    };
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.search) {
    where.fullName = {
      contains: filters.search,
      mode: "insensitive",
    };
  }

  const members = await prisma.member.findMany({
    where,
    include: {
      preceptor: {
        select: {
          name: true,
        },
      },
      modules: {
        select: {
          moduleType: true,
        },
      },
      parents: {
        select: {
          parent: {
            select: {
              id: true,
              fullName: true,
              relationship: true,
              sex: true,
              userId: true,
            },
          },
        },
      },
    },
    orderBy: [{ fullName: "asc" }],
  });

  return members.map((m) => {
    const signatures = parseSignatures(m.enrollmentFormUrl);
    const signers = buildSigners(
      m.parents.map((mp) => mp.parent),
      signatures
    );
    return {
      id: m.id,
      code: m.code,
      fullName: m.fullName,
      groupType: m.groupType,
      modules: m.modules.map((mod) => mod.moduleType),
      status: m.status,
      preceptorName: m.preceptor?.name ?? null,
      birthDate: m.birthDate.toISOString().split("T")[0],
      signatureStatus: statusFromSigners(signers),
      signers,
      enrollmentFormUrl: m.enrollmentFormUrl,
    };
  });
}
