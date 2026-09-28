"use server";

import { prisma } from "@/lib/prisma";
import { requireMonitor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import {
  memberEditSchema,
  type MemberEditData,
} from "@/modules/members/schemas/member-edit-schema";
import {
  reconcileMemberParents,
  type DesiredParent,
} from "@/modules/members/actions/reconcile-member-parents";
import type { GroupType, ModuleType } from "@/types";
import type { ParentRelationship, Sex } from "@/generated/prisma/client";

const VALID_GROUPS: GroupType[] = ["G1", "G2", "G3"];
const VALID_MODULES: ModuleType[] = ["QUINTA", "SEXTA", "SABADO"];

function relationshipLabel(rel: ParentRelationship): string {
  if (rel === "PAI") return "o pai";
  if (rel === "MAE") return "a mãe";
  return "o responsável";
}

/**
 * Save member data edits (MONITOR+ only).
 * Updates member core fields and reconciles the linked parents/guardians:
 *   - existing entries (with a linked id) are updated in place;
 *   - new entries are deduped/created via findOrCreateParent and linked;
 *   - entries removed from the form are UNLINKED only (never delete the Parent
 *     record — it may be shared with a sibling, and it owns attendance/activity
 *     history). Orphaned parents are harmless.
 * Does NOT touch signature/enrollment form data.
 */
export async function saveMemberEdit(
  memberId: string,
  formData: MemberEditData
): Promise<ActionResult<{ memberId: string }>> {
  try {
    const session = await requireMonitor();

    const parsed = memberEditSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }
    const d = parsed.data;

    const member = await prisma.member.findFirst({
      where: { id: memberId, clubId: session.clubId },
      include: {
        modules: true,
        parents: { select: { parentId: true } },
      },
    });
    if (!member) {
      return { success: false, error: "Sócio não encontrado." };
    }

    const existingLinkIds = new Set(member.parents.map((mp) => mp.parentId));

    // Collect the parents/guardians the form wants to keep (named entries only).
    const desired: DesiredParent[] = [];
    const pushEntry = (
      entry:
        | {
            id?: string;
            fullName?: string;
            cpf?: string;
            phone?: string;
            email?: string;
            profession?: string;
          }
        | undefined,
      relationship: ParentRelationship,
      sex: Sex
    ) => {
      if (!entry?.fullName?.trim()) return;
      desired.push({
        id: entry.id,
        relationship,
        sex,
        fullName: entry.fullName.trim(),
        cpf: entry.cpf ?? "",
        phone: entry.phone ?? "",
        email: entry.email ?? "",
        profession: entry.profession ?? "",
      });
    };

    pushEntry(d.father, "PAI", "MASCULINO");
    pushEntry(d.mother, "MAE", "FEMININO");
    for (const g of d.guardians ?? []) {
      pushEntry(g, "RESPONSAVEL", g.sex as Sex);
    }

    // New entries (not an existing linked parent) need an email to dedupe/create.
    for (const p of desired) {
      const isExisting = !!p.id && existingLinkIds.has(p.id);
      if (!isExisting && !p.email.trim()) {
        return {
          success: false,
          error: `E-mail é obrigatório para ${relationshipLabel(
            p.relationship
          )} "${p.fullName}".`,
        };
      }
    }

    // Member core update
    const memberUpdate: Record<string, unknown> = {
      fullName: d.memberName,
      birthDate: new Date(d.birthDate),
      address: d.address || null,
    };
    if (VALID_GROUPS.includes(d.groupType as GroupType)) {
      memberUpdate.groupType = d.groupType;
    }
    if (d.polaresUntil) {
      memberUpdate.polaresUntil = new Date(d.polaresUntil);
    } else if (d.groupType !== "G3") {
      memberUpdate.polaresUntil = null;
    }

    const newModules = d.modules?.filter((m) =>
      VALID_MODULES.includes(m as ModuleType)
    );
    const currentModules = member.modules.map((m) => m.moduleType);
    const modulesChanged =
      !!newModules &&
      newModules.length > 0 &&
      (newModules.length !== currentModules.length ||
        newModules.some((m) => !currentModules.includes(m as ModuleType)));

    await prisma.$transaction(async (tx) => {
      await tx.member.update({ where: { id: memberId }, data: memberUpdate });

      if (modulesChanged && newModules) {
        await tx.memberModule.deleteMany({ where: { memberId } });
        await tx.memberModule.createMany({
          data: newModules.map((moduleType) => ({
            memberId,
            moduleType: moduleType as ModuleType,
          })),
        });
      }

      await reconcileMemberParents(
        tx,
        session.clubId,
        memberId,
        desired,
        existingLinkIds
      );
    });

    revalidatePath("/socios");
    revalidatePath(`/socios/${memberId}/ficha`);
    return { success: true, data: { memberId } };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao salvar dados do sócio.";
    return { success: false, error: message };
  }
}
