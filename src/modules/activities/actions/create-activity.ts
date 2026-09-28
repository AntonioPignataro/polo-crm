"use server";

import { prisma } from "@/lib/prisma";
import { requirePreceptor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import {
  createActivitySchema,
  type CreateActivityInput,
} from "@/modules/activities/schemas/activity-schema";

export async function createActivity(
  input: CreateActivityInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requirePreceptor();

    const parsed = createActivitySchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const { name, description, startDate, endDate, costPerPerson } =
      parsed.data;

    const activity = await prisma.activity.create({
      data: {
        clubId: session.clubId,
        name,
        description: description ?? null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        costPerPerson: costPerPerson ?? null,
        createdBy: session.userId,
      },
    });

    revalidatePath("/atividades");
    return { success: true, data: { id: activity.id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao criar atividade.";
    return { success: false, error: message };
  }
}
