import { findOrCreateParent, type PrismaTx } from "./find-or-create-parent";
import type { ParentRelationship, Sex } from "@/generated/prisma/client";

export type DesiredParent = {
  id?: string;
  relationship: ParentRelationship;
  sex: Sex;
  fullName: string;
  cpf: string;
  phone: string;
  email: string;
  profession: string;
};

/**
 * Reconcile a member's linked parents/guardians to `desired`:
 *   - existing entries (id in existingLinkIds) are updated in place;
 *   - new entries are deduped/created via findOrCreateParent and linked;
 *   - links no longer wanted are removed.
 *
 * Sibling-safe by construction: the unlink is scoped to THIS member's rows
 * (`memberId` in the where), so a sibling's MemberParent (different memberId)
 * is never in scope, and Parent records themselves are never deleted (they may
 * be shared across siblings and own attendance/activity history).
 *
 * Must run inside a transaction. `existingLinkIds` = the member's currently
 * linked parentIds.
 */
export async function reconcileMemberParents(
  tx: PrismaTx,
  clubId: string,
  memberId: string,
  desired: DesiredParent[],
  existingLinkIds: Set<string>
): Promise<void> {
  const keptParentIds = new Set<string>();

  for (const p of desired) {
    const normalizedEmail = p.email.trim()
      ? p.email.toLowerCase().trim()
      : null;

    if (p.id && existingLinkIds.has(p.id)) {
      // Update an already-linked parent in place.
      await tx.parent.update({
        where: { id: p.id },
        data: {
          fullName: p.fullName,
          cpf: p.cpf || null,
          phone: p.phone || null,
          email: normalizedEmail,
          profession: p.profession || null,
          relationship: p.relationship,
          sex: p.sex,
        },
      });
      keptParentIds.add(p.id);
    } else {
      // New: dedupe or create, then ensure the link exists.
      const parentId = await findOrCreateParent(tx, clubId, {
        fullName: p.fullName,
        email: p.email.trim(),
        phone: p.phone || null,
        cpf: p.cpf || null,
        profession: p.profession || null,
        relationship: p.relationship,
        sex: p.sex,
      });
      await tx.memberParent.upsert({
        where: { memberId_parentId: { memberId, parentId } },
        create: { memberId, parentId },
        update: {},
      });
      keptParentIds.add(parentId);
    }
  }

  // Unlink parents removed from the form (link only — never delete Parent).
  const toUnlink = [...existingLinkIds].filter(
    (pid) => !keptParentIds.has(pid)
  );
  if (toUnlink.length > 0) {
    await tx.memberParent.deleteMany({
      where: { memberId, parentId: { in: toUnlink } },
    });
  }
}
