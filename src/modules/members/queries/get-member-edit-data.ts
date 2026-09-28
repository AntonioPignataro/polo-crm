"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";
import { MODULE_LABELS, GROUP_LABELS } from "@/lib/constants";
import type { ModuleType, GroupType } from "@/types";

export interface EditParentData {
  id: string;
  fullName: string;
  cpf: string;
  phone: string;
  email: string;
  profession: string;
}

export interface EditGuardianData extends EditParentData {
  sex: "MASCULINO" | "FEMININO" | "";
}

/**
 * Data for the member edit form (MONITOR+). Returns father / mother / guardians
 * as distinct, id-carrying entries (each guardian keeping its own sex) so the
 * form can edit any combination and the save can reconcile parent links.
 */
export interface MemberEditPageData {
  id: string;
  code: number;
  fullName: string;
  birthDate: string;
  address: string;
  groupType: string;
  groupLabel: string;
  moduleTypes: string[];
  moduleLabel: string;
  clubName: string;
  enrollmentFormUrl: string | null;
  father: EditParentData | null;
  mother: EditParentData | null;
  guardians: EditGuardianData[];
}

export async function getMemberEditData(
  memberId: string
): Promise<MemberEditPageData | null> {
  const session = await getRequiredSession();

  const member = await prisma.member.findFirst({
    where: { id: memberId, clubId: session.clubId },
    include: {
      club: { select: { name: true } },
      modules: { select: { moduleType: true } },
      parents: {
        include: {
          parent: {
            select: {
              id: true,
              fullName: true,
              cpf: true,
              phone: true,
              email: true,
              profession: true,
              relationship: true,
              sex: true,
            },
          },
        },
      },
    },
  });

  if (!member) return null;

  const toParent = (p: {
    id: string;
    fullName: string;
    cpf: string | null;
    phone: string | null;
    email: string | null;
    profession: string | null;
  }): EditParentData => ({
    id: p.id,
    fullName: p.fullName,
    cpf: p.cpf ?? "",
    phone: p.phone ?? "",
    email: p.email ?? "",
    profession: p.profession ?? "",
  });

  const fatherMp = member.parents.find(
    (mp) => mp.parent.relationship === "PAI"
  );
  const motherMp = member.parents.find(
    (mp) => mp.parent.relationship === "MAE"
  );
  const guardianMps = member.parents.filter(
    (mp) => mp.parent.relationship === "RESPONSAVEL"
  );

  const modulesLabel = member.modules
    .map((mod) => MODULE_LABELS[mod.moduleType as ModuleType] ?? mod.moduleType)
    .join(", ");

  return {
    id: member.id,
    code: member.code,
    fullName: member.fullName,
    birthDate: member.birthDate.toISOString().split("T")[0],
    address: member.address ?? "",
    groupType: member.groupType,
    groupLabel: GROUP_LABELS[member.groupType as GroupType] ?? member.groupType,
    moduleTypes: member.modules.map((mod) => mod.moduleType),
    moduleLabel: modulesLabel,
    clubName: member.club.name,
    enrollmentFormUrl: member.enrollmentFormUrl,
    father: fatherMp ? toParent(fatherMp.parent) : null,
    mother: motherMp ? toParent(motherMp.parent) : null,
    guardians: guardianMps.map((mp) => ({
      ...toParent(mp.parent),
      sex: (mp.parent.sex ?? "") as "MASCULINO" | "FEMININO" | "",
    })),
  };
}
