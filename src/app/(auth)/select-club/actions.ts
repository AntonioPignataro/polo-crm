"use server";

import { prisma } from "@/lib/prisma";
import { APEX_DOMAIN } from "@/lib/tenant";

export type FindClubResult =
  | { success: true; url: string }
  | { success: false; error: string };

export async function findClubUrl(slugInput: string): Promise<FindClubResult> {
  const slug = slugInput.toLowerCase().trim();

  if (!slug) {
    return { success: false, error: "Digite o identificador do clube." };
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return {
      success: false,
      error: "Identificador inválido. Use apenas letras, números e hífens.",
    };
  }

  const club = await prisma.club.findUnique({
    where: { slug },
    select: { isActive: true },
  });

  if (!club) {
    return {
      success: false,
      error:
        "Clube não encontrado. Verifique o identificador ou contate o administrador.",
    };
  }
  if (!club.isActive) {
    return {
      success: false,
      error: "Este clube está temporariamente indisponível.",
    };
  }

  return { success: true, url: `https://${slug}.${APEX_DOMAIN}` };
}
