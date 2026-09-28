"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { generateResetToken, RESET_TOKEN_TTL_MS } from "@/lib/password-reset";
import { passwordResetRequestLimiter } from "@/lib/rate-limit";
import type { ActionResult } from "@/lib/auth-utils";
import {
  requestResetSchema,
  type RequestResetInput,
} from "../schemas/reset-password-schema";

/**
 * Deliberately identical whether or not the address has an account — otherwise
 * this form doubles as a way to discover who is registered.
 */
const GENERIC_RESPONSE =
  "Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha. " +
  "O link vale por 1 hora. Verifique também a caixa de spam.";

function resetEmailHtml(resetUrl: string, clubName: string): string {
  // clubName comes from our own DB, but escape anyway — it is admin-editable.
  const safeClub = clubName.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c] ?? c
  );

  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #1e4d8b;">Redefinir sua senha</h2>
      <p>Recebemos um pedido para redefinir a senha da sua conta no ${safeClub}.</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}"
           style="background: #1e4d8b; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
          Criar nova senha
        </a>
      </p>
      <p style="font-size: 13px; color: #6b7280;">
        Este link vale por 1 hora e só pode ser usado uma vez.
        Se você não pediu isso, ignore este e-mail — sua senha continua a mesma.
      </p>
      <p style="font-size: 12px; color: #9ca3af; word-break: break-all;">
        Se o botão não funcionar, copie e cole este endereço no navegador:<br>${resetUrl}
      </p>
    </div>
  `;
}

export async function requestPasswordReset(
  input: RequestResetInput
): Promise<ActionResult<{ message: string }>> {
  try {
    const parsed = requestResetSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const email = parsed.data.email.toLowerCase().trim();
    const ok: ActionResult<{ message: string }> = {
      success: true,
      data: { message: GENERIC_RESPONSE },
    };

    // Over the limit: still answer generically, just don't send anything.
    if (!passwordResetRequestLimiter.check(email)) {
      return ok;
    }

    const h = await headers();
    const tenantSlug = h.get("x-tenant-slug");

    // Same tenant scoping as login: a subdomain only ever resolves its own
    // club's users. Without a slug (local dev / preview) fall back to the
    // first active club, matching register.ts.
    const user = await prisma.user.findFirst({
      where: {
        email,
        isActive: true,
        club: {
          isActive: true,
          ...(tenantSlug ? { slug: tenantSlug } : {}),
        },
      },
      select: { id: true, email: true, club: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });

    if (!user) {
      return ok;
    }

    const { token, tokenHash } = generateResetToken();

    // Issuing a new link retires any outstanding ones for this user.
    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      }),
    ]);

    const host = h.get("host") ?? "";
    const proto =
      h.get("x-forwarded-proto") ??
      (host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https");
    const resetUrl = `${proto}://${host}/redefinir-senha?token=${token}`;

    const result = await sendEmail({
      to: user.email,
      subject: "Redefinir sua senha — Sistema Polo",
      html: resetEmailHtml(resetUrl, user.club.name),
    });

    if (!result.success) {
      console.error("[password-reset] envio falhou:", result.error);
    }

    return ok;
  } catch (error) {
    console.error("[password-reset] erro:", error);
    // Don't leak internals to an unauthenticated form.
    return {
      success: false,
      error: "Não foi possível processar o pedido. Tente novamente.",
    };
  }
}
