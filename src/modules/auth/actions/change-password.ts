"use server";

import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getRequiredSession, type ActionResult } from "@/lib/auth-utils";
import { changePasswordLimiter } from "@/lib/rate-limit";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "../schemas/change-password-schema";

/**
 * Lets the authenticated user change their own password.
 *
 * No role check — every role, including parents (USUARIO), owns their own
 * credentials. The session is the authorization: a user can only ever reach
 * their own row.
 */
export async function changePassword(
  input: ChangePasswordInput
): Promise<ActionResult<void>> {
  try {
    const session = await getRequiredSession();

    const parsed = changePasswordSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }
    const { currentPassword, newPassword } = parsed.data;

    if (!changePasswordLimiter.check(session.userId)) {
      return {
        success: false,
        error:
          "Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.",
      };
    }

    // Club-scoped read, consistent with every other action here.
    const user = await prisma.user.findFirst({
      where: { id: session.userId, clubId: session.clubId, isActive: true },
      select: { id: true, passwordHash: true },
    });
    if (!user) {
      return { success: false, error: "Usuário não encontrado." };
    }

    const valid = await compare(currentPassword, user.passwordHash);
    if (!valid) {
      return { success: false, error: "Senha atual incorreta." };
    }

    // Same cost factor as registration (register.ts). Clearing
    // mustChangePassword is what releases the forced-change gate after a
    // director-issued temporary password.
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hash(newPassword, 12),
        mustChangePassword: false,
      },
    });

    // The owner proved they know the password — don't leave the throttle
    // counting against them.
    changePasswordLimiter.reset(session.userId);

    // The JWT carries no password material, so the session stays valid and
    // the user is not signed out.
    return { success: true, data: undefined };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao alterar a senha.";
    return { success: false, error: message };
  }
}
