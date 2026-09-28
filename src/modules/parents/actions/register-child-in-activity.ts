"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getParentContext, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

const registerSchema = z.object({
  activityId: z.string().min(1, { message: "Atividade é obrigatória." }),
  memberId: z.string().min(1, { message: "Filho é obrigatório." }),
});

export type RegisterChildInput = z.infer<typeof registerSchema>;

export async function registerChildInActivity(
  input: RegisterChildInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const parentCtx = await getParentContext();

    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const { activityId, memberId } = parsed.data;

    // Verify the member is a child of this parent
    if (!parentCtx.childrenIds.includes(memberId)) {
      return {
        success: false,
        error: "Você só pode inscrever seus próprios filhos.",
      };
    }

    // Verify activity exists and belongs to the club
    const activity = await prisma.activity.findFirst({
      where: {
        id: activityId,
        clubId: parentCtx.session.clubId,
        status: "INSCRICOES_ABERTAS",
      },
    });

    if (!activity) {
      return {
        success: false,
        error: "Atividade não encontrada ou inscrições não estão abertas.",
      };
    }

    // Check if already registered
    const existing = await prisma.activityRegistration.findFirst({
      where: { activityId, memberId },
    });

    if (existing) {
      return {
        success: false,
        error: "Este filho já está inscrito nesta atividade.",
      };
    }

    // Get member name for the registration
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { fullName: true },
    });

    const registration = await prisma.activityRegistration.create({
      data: {
        activityId,
        memberId,
        participantName: member?.fullName ?? "Desconhecido",
        isExternal: false,
        registeredBy: parentCtx.session.userId,
      },
    });

    revalidatePath("/atividades");
    revalidatePath("/meus-filhos");
    return { success: true, data: { id: registration.id } };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao inscrever na atividade.";
    return { success: false, error: message };
  }
}
