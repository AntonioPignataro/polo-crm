"use server";

import { prisma } from "@/lib/prisma";
import { requireDiretor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

export async function reactivateMember(
  memberId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireDiretor();

    const member = await prisma.member.findFirst({
      where: { id: memberId, clubId: session.clubId },
      select: { id: true, status: true, fullName: true },
    });

    if (!member) {
      return { success: false, error: "Sócio não encontrado no seu clube." };
    }

    if (member.status === "ATIVO") {
      return { success: false, error: "Este sócio já está ativo." };
    }

    await prisma.member.update({
      where: { id: memberId },
      data: { status: "ATIVO", inactivatedAt: null },
    });

    revalidatePath("/socios");
    revalidatePath("/socios/historico");
    return { success: true, data: { id: memberId } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao reativar sócio.";
    return { success: false, error: message };
  }
}
