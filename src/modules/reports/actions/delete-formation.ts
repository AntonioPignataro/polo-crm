"use server";

import { prisma } from "@/lib/prisma";
import { requireDiretor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

/**
 * Permanently deletes a parent formation.
 *
 * Permission: DIRETOR/SUPER_ADMIN only (matches {@link ./create-formation.ts}
 * and {@link ./update-formation.ts}).
 *
 * Cascade: ParentFormationAttendance rows reference this formation with
 * `onDelete: Cascade` in the schema, so attendance entries for the formation
 * are removed automatically by Postgres. Attendance is only meaningful while
 * the formation exists, so this is the expected behavior.
 */
export async function deleteFormation(
  id: string
): Promise<ActionResult<{ id: string; attendanceCount: number }>> {
  try {
    const session = await requireDiretor();

    if (!id || typeof id !== "string") {
      return { success: false, error: "ID da formação é obrigatório." };
    }

    const formation = await prisma.parentFormation.findUnique({
      where: { id },
      select: {
        clubId: true,
        _count: { select: { attendance: true } },
      },
    });

    if (!formation) {
      return { success: false, error: "Formação não encontrada." };
    }

    if (formation.clubId !== session.clubId) {
      return {
        success: false,
        error: "Formação não pertence ao seu clube.",
      };
    }

    const attendanceCount = formation._count.attendance;

    await prisma.parentFormation.delete({ where: { id } });

    revalidatePath("/formacao-pais");
    return { success: true, data: { id, attendanceCount } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao excluir formação.";
    return { success: false, error: message };
  }
}
