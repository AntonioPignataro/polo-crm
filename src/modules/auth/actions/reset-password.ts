"use server";

import { headers } from "next/headers";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashResetToken } from "@/lib/password-reset";
import { passwordResetRedeemLimiter } from "@/lib/rate-limit";
import type { ActionResult } from "@/lib/auth-utils";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "../schemas/reset-password-schema";

const INVALID =
  "Este link é inválido ou expirou. Peça um novo link em “Esqueci minha senha”.";

/**
 * Redeems a reset token from the emailed link and sets a new password.
 * Public (unauthenticated) by design — the token IS the credential.
 */
export async function resetPassword(
  input: ResetPasswordInput
): Promise<ActionResult<void>> {
  try {
    const parsed = resetPasswordSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }
    const { token, newPassword } = parsed.data;

    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconhecido";
    if (!passwordResetRedeemLimiter.check(ip)) {
      return {
        success: false,
        error: "Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.",
      };
    }

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashResetToken(token) },
      select: {
        id: true,
        userId: true,
        usedAt: true,
        expiresAt: true,
        user: { select: { isActive: true } },
      },
    });

    // One generic message for every failure mode — an attacker holding a token
    // learns nothing about whether it existed, was spent, or simply expired.
    if (
      !record ||
      record.usedAt !== null ||
      record.expiresAt < new Date() ||
      !record.user.isActive
    ) {
      return { success: false, error: INVALID };
    }

    const passwordHash = await hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, mustChangePassword: false },
      }),
      // Spend this token and retire any siblings, so one email can't be
      // replayed and an older link can't still be redeemed.
      prisma.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("[password-reset] erro ao redefinir:", error);
    return {
      success: false,
      error: "Não foi possível redefinir a senha. Tente novamente.",
    };
  }
}
