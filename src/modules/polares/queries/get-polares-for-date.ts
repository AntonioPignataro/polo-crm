"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";
import { CHECKBOX_LANCAMENTO_CATEGORIES } from "@/modules/polares/lancamento-categories";
import type { PolarCategory } from "@/types";

/**
 * Existing checkbox-category polares for a given date in the user's club.
 * Returned as `Record<memberId, PolarCategory[]>` so it serializes cleanly
 * across the server/client boundary.
 *
 * Only categories shown as CHECKBOXES in the Lançamento tab are returned —
 * additive categories (OUTROS_PONTOS) are intentionally excluded so they
 * don't pre-fill the input on date change.
 */
export async function getPolaresForDate(
  date: string
): Promise<Record<string, PolarCategory[]>> {
  const session = await getRequiredSession();

  if (!date) return {};
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) return {};

  const entries = await prisma.polarEntry.findMany({
    where: {
      date: parsedDate,
      category: { in: [...CHECKBOX_LANCAMENTO_CATEGORIES] },
      member: { clubId: session.clubId },
    },
    select: {
      memberId: true,
      category: true,
    },
  });

  const result: Record<string, PolarCategory[]> = {};
  for (const e of entries) {
    if (!result[e.memberId]) result[e.memberId] = [];
    if (!result[e.memberId].includes(e.category)) {
      result[e.memberId].push(e.category);
    }
  }
  return result;
}
