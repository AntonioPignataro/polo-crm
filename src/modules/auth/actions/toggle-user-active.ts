"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, type ActionResult } from "@/lib/auth-utils";
import {
  toggleUserActiveSchema,
  type ToggleUserActiveInput,
} from "../schemas/update-user-schema";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/types";

export async function toggleUserActive(
  input: ToggleUserActiveInput
): Promise<ActionResult<void>> {
  try {
    const session = await requireRole("DIRETOR");

    const parsed = toggleUserActiveSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }
    const { userId, isActive } = parsed.data;

    // Cannot deactivate yourself
    if (userId === session.userId) {
      return {
        success: false,
        error: "Você não pode desativar sua própria conta.",
      };
    }

    // Target must be in same club
    const targetUser = await prisma.user.findFirst({
      where: { id: userId, clubId: session.clubId },
    });
    if (!targetUser) {
      return { success: false, error: "Usuário não encontrado." };
    }

    // DIRETOR cannot deactivate SUPER_ADMIN
    if (
      session.role !== "SUPER_ADMIN" &&
      (targetUser.role as UserRole) === "SUPER_ADMIN"
    ) {
      return {
        success: false,
        error:
          "Você não pode alterar o status de um usuário com papel superior ao seu.",
      };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    revalidatePath("/usuarios");
    return { success: true, data: undefined };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao atualizar status.";
    return { success: false, error: message };
  }
}
