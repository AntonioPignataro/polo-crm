"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, type ActionResult } from "@/lib/auth-utils";
import {
  updateUserRoleSchema,
  type UpdateUserRoleInput,
} from "../schemas/update-user-schema";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/types";

// Role hierarchy: lower index = higher privilege
const ROLE_HIERARCHY: UserRole[] = [
  "SUPER_ADMIN",
  "DIRETOR",
  "PRECEPTOR",
  "MONITOR",
  "USUARIO",
];

function getRoleLevel(role: UserRole): number {
  return ROLE_HIERARCHY.indexOf(role);
}

export async function updateUserRole(
  input: UpdateUserRoleInput
): Promise<ActionResult<void>> {
  try {
    const session = await requireRole("DIRETOR");

    // Validate input
    const parsed = updateUserRoleSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }
    const { userId, role: newRole } = parsed.data;

    // Cannot change own role
    if (userId === session.userId) {
      return {
        success: false,
        error: "Você não pode alterar seu próprio papel.",
      };
    }

    // Fetch target user (must be in same club)
    const targetUser = await prisma.user.findFirst({
      where: { id: userId, clubId: session.clubId },
    });
    if (!targetUser) {
      return { success: false, error: "Usuário não encontrado." };
    }

    // RBAC hierarchy checks (SUPER_ADMIN bypasses)
    if (session.role !== "SUPER_ADMIN") {
      const actorLevel = getRoleLevel(session.role as UserRole);
      const targetCurrentLevel = getRoleLevel(targetUser.role as UserRole);
      const targetNewLevel = getRoleLevel(newRole as UserRole);

      // DIRETOR cannot manage SUPER_ADMIN users
      if (targetCurrentLevel < actorLevel) {
        return {
          success: false,
          error:
            "Você não pode alterar o papel de um usuário com papel superior ao seu.",
        };
      }

      // DIRETOR cannot assign SUPER_ADMIN
      if (targetNewLevel < actorLevel) {
        return {
          success: false,
          error: "Você não pode atribuir um papel superior ao seu.",
        };
      }
    }

    // Perform update
    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    revalidatePath("/usuarios");
    return { success: true, data: undefined };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao atualizar papel.";
    return { success: false, error: message };
  }
}
