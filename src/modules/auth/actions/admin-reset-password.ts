"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, type ActionResult } from "@/lib/auth-utils";
import { generateTempPassword } from "@/lib/password-reset";
import type { UserRole } from "@/types";
import {
  adminResetSchema,
  type AdminResetInput,
} from "../schemas/reset-password-schema";

/**
 * Fallback recovery path: a DIRETOR issues a temporary password for someone
 * whose e-mail is wrong or unreachable, and reads it out to them.
 *
 * The temp password is returned ONCE, to be shown on screen — it is never
 * stored in readable form. `mustChangePassword` forces the owner to replace it
 * on their next dashboard load, so the director does not keep knowing a
 * working password for someone else's account.
 */
export async function adminResetPassword(
  input: AdminResetInput
): Promise<ActionResult<{ tempPassword: string; userName: string }>> {
  try {
    const session = await requireRole("DIRETOR");

    const parsed = adminResetSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }
    const { userId } = parsed.data;

    // Club-scoped: a director can never reach another tenant's users.
    const targetUser = await prisma.user.findFirst({
      where: { id: userId, clubId: session.clubId },
      select: { id: true, name: true, role: true },
    });
    if (!targetUser) {
      return { success: false, error: "Usuário não encontrado." };
    }

    // Mirrors toggle-user-active: only a SUPER_ADMIN may act on a SUPER_ADMIN.
    if (
      session.role !== "SUPER_ADMIN" &&
      (targetUser.role as UserRole) === "SUPER_ADMIN"
    ) {
      return {
        success: false,
        error:
          "Você não pode redefinir a senha de um usuário com papel superior ao seu.",
      };
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hash(tempPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: targetUser.id },
        data: { passwordHash, mustChangePassword: true },
      }),
      // Any emailed reset link outstanding for this user is now stale.
      prisma.passwordResetToken.updateMany({
        where: { userId: targetUser.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);

    revalidatePath("/usuarios");
    return {
      success: true,
      data: { tempPassword, userName: targetUser.name },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao redefinir a senha.";
    return { success: false, error: message };
  }
}
