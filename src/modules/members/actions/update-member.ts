"use server";

import { prisma } from "@/lib/prisma";
import { requireMonitor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

interface UpdateMemberInput {
  id: string;
  fullName?: string;
  birthDate?: string;
  address?: string | null;
  groupType?: "G1" | "G2" | "G3";
  modules?: ("QUINTA" | "SEXTA" | "SABADO")[];
  status?: "ATIVO" | "INATIVO";
  preceptorId?: string | null;
}

export async function updateMember(
  input: UpdateMemberInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireMonitor();

    // Verify member belongs to the same club
    const existing = await prisma.member.findFirst({
      where: {
        id: input.id,
        clubId: session.clubId,
      },
    });

    if (!existing) {
      return { success: false, error: "Sócio não encontrado." };
    }

    const updateData: Record<string, unknown> = {};
    if (input.fullName !== undefined) updateData.fullName = input.fullName;
    if (input.birthDate !== undefined)
      updateData.birthDate = new Date(input.birthDate);
    if (input.address !== undefined) updateData.address = input.address;
    if (input.groupType !== undefined) updateData.groupType = input.groupType;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.preceptorId !== undefined)
      updateData.preceptorId = input.preceptorId;

    await prisma.$transaction(async (tx) => {
      // Update the member fields
      await tx.member.update({
        where: { id: input.id },
        data: updateData,
      });

      // If modules are provided, replace all MemberModule records
      if (input.modules !== undefined) {
        // Delete old module records
        await tx.memberModule.deleteMany({
          where: { memberId: input.id },
        });

        // Create new module records
        for (const moduleType of input.modules) {
          await tx.memberModule.create({
            data: {
              memberId: input.id,
              moduleType,
            },
          });
        }
      }
    });

    revalidatePath("/socios");
    return { success: true, data: { id: input.id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao atualizar sócio.";
    return { success: false, error: message };
  }
}
