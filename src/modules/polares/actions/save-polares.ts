"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMonitor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import {
  CHECKBOX_LANCAMENTO_CATEGORIES,
  ADDITIVE_LANCAMENTO_CATEGORIES,
} from "@/modules/polares/lancamento-categories";
import type { PolarCategory } from "@/types";

const checkboxCategoryEnum = z.enum(CHECKBOX_LANCAMENTO_CATEGORIES, {
  message: "Categoria de checkbox inválida.",
});

const additiveCategoryEnum = z.enum(ADDITIVE_LANCAMENTO_CATEGORIES, {
  message: "Categoria aditiva inválida.",
});

const checkboxEntrySchema = z.object({
  memberId: z.string().min(1, { message: "ID do sócio é obrigatório." }),
  category: checkboxCategoryEnum,
  points: z.number().int({ message: "Pontos devem ser um número inteiro." }),
});

const additiveEntrySchema = z.object({
  memberId: z.string().min(1, { message: "ID do sócio é obrigatório." }),
  category: additiveCategoryEnum,
  points: z.number().int({ message: "Pontos devem ser um número inteiro." }),
});

const savePolaresSchema = z.object({
  date: z.string().min(1, { message: "Data é obrigatória." }),
  memberIds: z
    .array(z.string().min(1))
    .min(1, { message: "Lista de sócios é obrigatória." }),
  checkboxEntries: z.array(checkboxEntrySchema),
  additiveEntries: z.array(additiveEntrySchema),
});

export type SavePolaresInput = z.infer<typeof savePolaresSchema>;

/**
 * Saves polar entries for a given date.
 *
 * Behavior mirrors the attendance screen:
 * - **Checkbox categories**: replace existing entries for `(memberId, date, category)`
 *   within the loaded `memberIds` set. Picking the same date again loads the
 *   current state; saving with a checkbox unchecked removes that entry.
 * - **Additive categories (OUTROS_PONTOS)**: append new entries — never replaces
 *   existing ones. Multiple entries per (member, date) are allowed.
 *
 * The delete-replace is scoped to `memberIds` (members the client knew about
 * when building the form) so members hidden from lançamento today (e.g. expired
 * G2 polaresUntil) keep their historical entries untouched.
 */
export async function savePolares(
  input: SavePolaresInput
): Promise<ActionResult<{ checkboxCount: number; additiveCount: number }>> {
  try {
    const session = await requireMonitor();

    const parsed = savePolaresSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const { date, memberIds, checkboxEntries, additiveEntries } = parsed.data;
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return { success: false, error: "Data inválida." };
    }

    // Verify all member IDs (loaded scope + entries) belong to the user's club.
    const allMemberIds = new Set<string>([
      ...memberIds,
      ...checkboxEntries.map((e) => e.memberId),
      ...additiveEntries.map((e) => e.memberId),
    ]);
    const membersInClub = await prisma.member.count({
      where: {
        id: { in: [...allMemberIds] },
        clubId: session.clubId,
      },
    });
    if (membersInClub !== allMemberIds.size) {
      return {
        success: false,
        error: "Um ou mais sócios não pertencem ao seu clube.",
      };
    }

    // Entries must reference members in the loaded scope (prevents writing to
    // members the client didn't explicitly load).
    const memberIdSet = new Set(memberIds);
    const outOfScope = [...checkboxEntries, ...additiveEntries].some(
      (e) => !memberIdSet.has(e.memberId)
    );
    if (outOfScope) {
      return {
        success: false,
        error: "Há lançamentos para sócios fora do escopo carregado.",
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Replace checkbox state for these members on this date.
      await tx.polarEntry.deleteMany({
        where: {
          memberId: { in: memberIds },
          date: parsedDate,
          category: { in: [...CHECKBOX_LANCAMENTO_CATEGORIES] },
        },
      });

      let checkboxCount = 0;
      if (checkboxEntries.length > 0) {
        const r = await tx.polarEntry.createMany({
          data: checkboxEntries.map((e) => ({
            memberId: e.memberId,
            date: parsedDate,
            category: e.category as PolarCategory,
            points: e.points,
            registeredBy: session.userId,
          })),
        });
        checkboxCount = r.count;
      }

      let additiveCount = 0;
      if (additiveEntries.length > 0) {
        const r = await tx.polarEntry.createMany({
          data: additiveEntries.map((e) => ({
            memberId: e.memberId,
            date: parsedDate,
            category: e.category as PolarCategory,
            points: e.points,
            registeredBy: session.userId,
          })),
        });
        additiveCount = r.count;
      }

      return { checkboxCount, additiveCount };
    });

    revalidatePath("/polares");
    return { success: true, data: result };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao salvar polares.";
    return { success: false, error: message };
  }
}
