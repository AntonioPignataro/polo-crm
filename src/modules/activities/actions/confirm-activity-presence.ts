"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequiredSession, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

const confirmPresenceSchema = z.object({
  activityId: z.string().min(1),
  selectedMemberIds: z.array(z.string()),
  selectedParentId: z.string().nullable(),
  canGiveRide: z.boolean(),
  needsRide: z.boolean(),
});

export type ConfirmActivityPresenceInput = z.infer<typeof confirmPresenceSchema>;

export async function confirmActivityPresence(
  input: ConfirmActivityPresenceInput
): Promise<ActionResult<{ count: number }>> {
  try {
    const session = await getRequiredSession();

    if (!session.parentId) {
      return { success: false, error: "Você precisa estar vinculado como pai/responsável." };
    }

    const parsed = confirmPresenceSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const { activityId, selectedMemberIds, selectedParentId, canGiveRide, needsRide } =
      parsed.data;

    if (selectedMemberIds.length === 0 && !selectedParentId) {
      return { success: false, error: "Selecione pelo menos uma pessoa." };
    }

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

    let count = 0;

    // Register members
    for (const memberId of selectedMemberIds) {
      // Check if already registered
      const existing = await prisma.activityRegistration.findFirst({
        where: { activityId, memberId },
      });
      if (existing) continue;

      const member = await prisma.member.findUnique({
        where: { id: memberId },
        select: { fullName: true },
      });

      await prisma.activityRegistration.create({
        data: {
          activityId,
          memberId,
          participantName: member?.fullName ?? "Desconhecido",
          isExternal: false,
          canGiveRide,
          needsRide,
          registeredBy: session.userId,
        },
      });
      count++;
    }

    // Register father/male guardian if selected
    if (selectedParentId) {
      const existing = await prisma.activityRegistration.findFirst({
        where: { activityId, parentId: selectedParentId },
      });

      if (!existing) {
        const parentRecord = await prisma.parent.findUnique({
          where: { id: selectedParentId },
          select: { fullName: true },
        });

        await prisma.activityRegistration.create({
          data: {
            activityId,
            parentId: selectedParentId,
            participantName: parentRecord?.fullName ?? "Desconhecido",
            isExternal: false,
            canGiveRide,
            needsRide,
            registeredBy: session.userId,
          },
        });
        count++;
      }
    }

    revalidatePath("/atividades");
    return { success: true, data: { count } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao confirmar presença.";
    return { success: false, error: message };
  }
}
