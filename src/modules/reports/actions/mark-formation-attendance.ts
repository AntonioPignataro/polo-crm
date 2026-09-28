"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMonitor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import type { FormationType } from "@/types";

const presenceSchema = z.object({
  parentId: z.string().min(1),
  present: z.boolean(),
});

const inputSchema = z.object({
  formationId: z.string().min(1),
  presences: z.array(presenceSchema),
});

export type MarkFormationAttendanceInput = z.infer<typeof inputSchema>;

/**
 * Set monitor-verified attendance for a batch of parents on one formation.
 * Only `present` is touched — RSVP (`confirmed`) is preserved as-is.
 *
 * Permission: MONITOR+ (matches polares + presença writers).
 *
 * No date guard: monitors can mark attendance for any formation, past or
 * future. This is intentional — backfill of past formations is a real
 * use case.
 *
 * Eligibility check: parents that aren't eligible for the formation type
 * (e.g. a mother for FORMACAO_PAI) are silently skipped instead of erroring,
 * to allow the UI to optimistically send the full batch even if some entries
 * shouldn't apply.
 */
export async function markFormationAttendance(
  input: MarkFormationAttendanceInput
): Promise<ActionResult<{ updated: number }>> {
  try {
    const session = await requireMonitor();

    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const { formationId, presences } = parsed.data;

    if (presences.length === 0) {
      return { success: true, data: { updated: 0 } };
    }

    // Verify the formation belongs to the user's club.
    const formation = await prisma.parentFormation.findFirst({
      where: { id: formationId, clubId: session.clubId },
      select: { id: true, type: true },
    });
    if (!formation) {
      return { success: false, error: "Formação não encontrada." };
    }
    const formationType = formation.type as FormationType;

    // Verify all referenced parents are linked to club members + check
    // FORMACAO_PAI eligibility (males only).
    const parentIds = [...new Set(presences.map((p) => p.parentId))];
    const parents = await prisma.parent.findMany({
      where: {
        id: { in: parentIds },
        memberParents: { some: { member: { clubId: session.clubId } } },
      },
      select: { id: true, relationship: true, sex: true },
    });
    const parentMap = new Map(parents.map((p) => [p.id, p]));

    const eligible = presences.filter((p) => {
      const parent = parentMap.get(p.parentId);
      if (!parent) return false;
      if (formationType === "FORMACAO_PAI") {
        if (parent.relationship === "PAI") return true;
        if (parent.relationship === "MAE") return false;
        return parent.sex === "MASCULINO";
      }
      return true;
    });

    // Collapse to one desired present-state per parent (last occurrence wins,
    // matching the previous upsert-per-entry behavior; also dedupes any repeated
    // parentId in the incoming batch).
    const desiredPresence = new Map<string, boolean>();
    for (const entry of eligible) desiredPresence.set(entry.parentId, entry.present);
    const targetParentIds = [...desiredPresence.keys()];

    let updated = 0;
    if (targetParentIds.length > 0) {
      // Batched writes: 1 read + 1 createMany + up to 2 updateMany, regardless of
      // how many parents are in the batch. The previous one-upsert-per-parent loop
      // ran a separate round-trip per parent and blew past the 5s interactive-
      // transaction timeout on the serverless pooler for formations with many
      // parents (Prisma P2028: "transaction ... expired").
      await prisma.$transaction(
        async (tx) => {
          const existing = await tx.parentFormationAttendance.findMany({
            where: { formationId, parentId: { in: targetParentIds } },
            select: { parentId: true },
          });
          const existingIds = new Set(existing.map((r) => r.parentId));

          // New rows: insert with the monitor-only defaults.
          const toCreate = targetParentIds.filter((id) => !existingIds.has(id));
          if (toCreate.length > 0) {
            await tx.parentFormationAttendance.createMany({
              data: toCreate.map((parentId) => ({
                formationId,
                parentId,
                confirmed: false, // monitor-only mark, parent didn't RSVP via this path
                present: desiredPresence.get(parentId)!,
              })),
              skipDuplicates: true,
            });
          }

          // Existing rows: only touch `present` (preserve each parent's RSVP
          // `confirmed`). Two bulk updates, grouped by the target present value.
          const setTrue = targetParentIds.filter(
            (id) => existingIds.has(id) && desiredPresence.get(id) === true
          );
          const setFalse = targetParentIds.filter(
            (id) => existingIds.has(id) && desiredPresence.get(id) === false
          );
          if (setTrue.length > 0) {
            await tx.parentFormationAttendance.updateMany({
              where: { formationId, parentId: { in: setTrue } },
              data: { present: true },
            });
          }
          if (setFalse.length > 0) {
            await tx.parentFormationAttendance.updateMany({
              where: { formationId, parentId: { in: setFalse } },
              data: { present: false },
            });
          }
        },
        // Safety margin over the 5s default; the batched writes keep this to ~4
        // statements, so the headroom is rarely needed but cheap insurance
        // against cold-start latency spikes on the serverless pooler.
        { timeout: 15_000 }
      );
      updated = targetParentIds.length;
    }

    revalidatePath("/formacao-pais");
    return { success: true, data: { updated } };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao registrar presença na formação.";
    return { success: false, error: message };
  }
}
