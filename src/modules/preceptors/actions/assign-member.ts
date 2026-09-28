"use server";

import { prisma } from "@/lib/prisma";
import { requireDiretor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

export async function assignMemberToPreceptor(
  memberId: string,
  preceptorId: string | null
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireDiretor();

    // Validate member belongs to club
    const member = await prisma.member.findFirst({
      where: { id: memberId, clubId: session.clubId },
      select: { id: true },
    });

    if (!member) {
      return { success: false, error: "Sócio não encontrado no seu clube." };
    }

    // If assigning (not unassigning), validate preceptor exists in club
    if (preceptorId !== null) {
      const preceptor = await prisma.user.findFirst({
        where: {
          id: preceptorId,
          clubId: session.clubId,
          role: { in: ["PRECEPTOR", "DIRETOR"] },
          isActive: true,
        },
        select: { id: true },
      });

      if (!preceptor) {
        return { success: false, error: "Preceptor não encontrado." };
      }
    }

    await prisma.member.update({
      where: { id: memberId },
      data: { preceptorId },
    });

    revalidatePath("/preceptores");
    return { success: true, data: { id: memberId } };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao atribuir preceptor.";
    return { success: false, error: message };
  }
}
