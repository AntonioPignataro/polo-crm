"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMonitor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

const registerMonitorSchema = z.object({
  activityId: z.string().min(1),
  selectedMemberIds: z.array(z.string()),
  selectedParentId: z.string().nullable(),
  registerSelf: z.boolean(),
  canGiveRide: z.boolean(),
  needsRide: z.boolean(),
});

export type RegisterMonitorInput = z.infer<typeof registerMonitorSchema>;

/**
 * Registers a MONITOR+ user (and optionally their children) in an activity.
 * - registerSelf: registers the monitor themselves via userId
 * - selectedMemberIds: registers children (if monitor is also a parent)
 * - selectedParentId: registers a parent (father/guardian of children)
 */
export async function registerMonitorInActivity(
  input: RegisterMonitorInput
): Promise<ActionResult<{ count: number }>> {
  try {
    const session = await requireMonitor();

    const parsed = registerMonitorSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const {
      activityId,
      selectedMemberIds,
      selectedParentId,
      registerSelf,
      canGiveRide,
      needsRide,
    } = parsed.data;

    if (selectedMemberIds.length === 0 && !selectedParentId && !registerSelf) {
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

    // Register self (monitor) via userId
    if (registerSelf) {
      const existing = await prisma.activityRegistration.findFirst({
        where: { activityId, userId: session.userId },
      });

      if (!existing) {
        await prisma.activityRegistration.create({
          data: {
            activityId,
            userId: session.userId,
            participantName: session.name,
            isExternal: false,
            canGiveRide,
            needsRide,
            registeredBy: session.userId,
          },
        });
        count++;
      }
    }

    // Register children (members)
    for (const memberId of selectedMemberIds) {
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
      error instanceof Error ? error.message : "Erro ao inscrever na atividade.";
    return { success: false, error: message };
  }
}
