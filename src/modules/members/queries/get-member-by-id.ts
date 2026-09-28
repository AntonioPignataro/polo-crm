"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";
import type { ModuleType } from "@/types";

export interface MemberDetail {
  id: string;
  code: number;
  fullName: string;
  birthDate: string;
  address: string | null;
  groupType: string;
  modules: ModuleType[];
  status: string;
  enrollmentDate: string | null;
  enrollmentFormUrl: string | null;
  preceptor: {
    id: string;
    name: string;
  } | null;
  parents: {
    id: string;
    fullName: string;
    phone: string | null;
    email: string | null;
    cpf: string | null;
    profession: string | null;
    relationship: string;
  }[];
  createdAt: string;
}

export async function getMemberById(
  memberId: string
): Promise<MemberDetail | null> {
  const session = await getRequiredSession();

  const member = await prisma.member.findFirst({
    where: {
      id: memberId,
      clubId: session.clubId,
    },
    include: {
      preceptor: {
        select: {
          id: true,
          name: true,
        },
      },
      modules: {
        select: {
          moduleType: true,
        },
      },
      parents: {
        include: {
          parent: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              email: true,
              cpf: true,
              profession: true,
              relationship: true,
            },
          },
        },
      },
    },
  });

  if (!member) return null;

  return {
    id: member.id,
    code: member.code,
    fullName: member.fullName,
    birthDate: member.birthDate.toISOString().split("T")[0],
    address: member.address,
    groupType: member.groupType,
    modules: member.modules.map((m) => m.moduleType),
    status: member.status,
    enrollmentDate: member.enrollmentDate?.toISOString().split("T")[0] ?? null,
    enrollmentFormUrl: member.enrollmentFormUrl,
    preceptor: member.preceptor
      ? { id: member.preceptor.id, name: member.preceptor.name }
      : null,
    parents: member.parents.map((mp) => ({
      id: mp.parent.id,
      fullName: mp.parent.fullName,
      phone: mp.parent.phone,
      email: mp.parent.email,
      cpf: mp.parent.cpf,
      profession: mp.parent.profession,
      relationship: mp.parent.relationship,
    })),
    createdAt: member.createdAt.toISOString(),
  };
}
