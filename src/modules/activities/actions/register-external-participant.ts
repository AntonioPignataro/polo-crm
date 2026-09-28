"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMonitor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

const registerExternalSchema = z.object({
  activityId: z.string().min(1),
  participantName: z.string().min(1, { message: "Nome do participante é obrigatório." }),
});

export type RegisterExternalInput = z.infer<typeof registerExternalSchema>;

export async function registerExternalParticipant(
  input: RegisterExternalInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireMonitor();

    const parsed = registerExternalSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const { activityId, participantName } = parsed.data;

    // Verify activity exists and belongs to the club
    const activity = await prisma.activity.findFirst({
      where: {
        id: activityId,
        clubId: session.clubId,
      },
    });

    if (!activity) {
      return { success: false, error: "Atividade não encontrada." };
    }

    const registration = await prisma.activityRegistration.create({
      data: {
        activityId,
        participantName,
        isExternal: true,
        registeredBy: session.userId,
      },
    });

    revalidatePath("/atividades");
    return { success: true, data: { id: registration.id } };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao registrar participante externo.";
    return { success: false, error: message };
  }
}
