"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";
import type { FormationType } from "@/types";

export interface ParentForFormationAttendance {
  parentId: string;
  fullName: string;
  relationship: string;
  /** Parent self-RSVPd for this formation. */
  confirmed: boolean;
  /** Monitor has marked this parent present. Only this counts for reports. */
  present: boolean;
}

/**
 * Returns the list of parents eligible for a given formation, with their
 * current RSVP + attendance state. Used by the "Lançar presença" dialog.
 *
 * Eligibility:
 * - All parents linked to the club's members.
 * - For FORMACAO_PAI: only "men" — relationship=PAI, or relationship=RESPONSAVEL with sex=MASCULINO.
 * - For FORMACAO_CASAL: any parent.
 *
 * Sorted: confirmed RSVPs first, then alphabetical, so monitors see the
 * parents most likely to attend at the top.
 */
export async function getParentsForFormationAttendance(
  formationId: string
): Promise<ParentForFormationAttendance[]> {
  const session = await getRequiredSession();

  const formation = await prisma.parentFormation.findFirst({
    where: { id: formationId, clubId: session.clubId },
    select: { id: true, type: true },
  });

  if (!formation) return [];

  const formationType = formation.type as FormationType;

  // All parents linked to club members + their existing attendance row for this formation.
  const parents = await prisma.parent.findMany({
    where: {
      memberParents: {
        some: { member: { clubId: session.clubId } },
      },
    },
    select: {
      id: true,
      fullName: true,
      relationship: true,
      sex: true,
      parentFormationAttendance: {
        where: { formationId },
        select: { confirmed: true, present: true },
      },
    },
    orderBy: { fullName: "asc" },
  });

  // Filter by eligibility for the formation type.
  const eligible = parents.filter((p) => {
    if (formationType === "FORMACAO_PAI") {
      if (p.relationship === "PAI") return true;
      if (p.relationship === "MAE") return false;
      return p.sex === "MASCULINO";
    }
    return true; // FORMACAO_CASAL: any parent
  });

  const result = eligible.map((p) => {
    const att = p.parentFormationAttendance[0];
    return {
      parentId: p.id,
      fullName: p.fullName,
      relationship: p.relationship,
      confirmed: att?.confirmed ?? false,
      present: att?.present ?? false,
    };
  });

  // Confirmed RSVPs first, then alphabetical.
  result.sort((a, b) => {
    if (a.confirmed !== b.confirmed) return a.confirmed ? -1 : 1;
    return a.fullName.localeCompare(b.fullName);
  });

  return result;
}
