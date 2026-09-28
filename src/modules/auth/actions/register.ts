"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import {
  registerSchema,
  type RegisterInput,
} from "../schemas/register-schema";
import type { ActionResult } from "@/lib/auth-utils";

export async function registerUser(
  input: RegisterInput
): Promise<ActionResult<{ id: string }>> {
  try {
    // Validate input
    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }
    const data = parsed.data;
    const normalizedEmail = data.email.toLowerCase().trim();

    // Resolve the tenant from the subdomain (set by middleware).
    // In local dev / preview, no slug → fall back to first active club.
    // In production with no slug, reject — user should go through /select-club.
    const tenantSlug = (await headers()).get("x-tenant-slug");
    let club;
    if (tenantSlug) {
      club = await prisma.club.findUnique({ where: { slug: tenantSlug } });
      if (!club || !club.isActive) {
        return {
          success: false,
          error: "Clube não encontrado ou indisponível.",
        };
      }
    } else if (process.env.NODE_ENV !== "production") {
      club = await prisma.club.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
      });
      if (!club) {
        return { success: false, error: "Nenhum clube ativo encontrado." };
      }
    } else {
      return {
        success: false,
        error: "Acesso direto não permitido. Use a URL do seu clube.",
      };
    }

    // Check if email already exists in this club
    const existing = await prisma.user.findUnique({
      where: { clubId_email: { clubId: club.id, email: normalizedEmail } },
    });
    if (existing) {
      return { success: false, error: "Este email já está cadastrado." };
    }

    // Hash password and create user with USUARIO role
    const passwordHash = await hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        clubId: club.id,
        email: normalizedEmail,
        passwordHash,
        name: data.name,
        role: "USUARIO",
        phone: data.phone || null,
        isActive: true,
      },
    });

    // Bi-directional link: if an unlinked Parent with this email exists, connect them
    const unlinkedParent = await prisma.parent.findFirst({
      where: {
        email: normalizedEmail,
        userId: null,
        memberParents: { some: { member: { clubId: club.id } } },
      },
      select: { id: true },
    });
    if (unlinkedParent) {
      await prisma.parent.update({
        where: { id: unlinkedParent.id },
        data: { userId: user.id },
      });
    }

    return { success: true, data: { id: user.id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao criar conta.";
    return { success: false, error: message };
  }
}
