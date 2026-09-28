"use server";

import { prisma } from "@/lib/prisma";
import { requireMonitor, type ActionResult } from "@/lib/auth-utils";
import { createMemberSchema, type CreateMemberInput } from "../schemas/member-schema";
import { revalidatePath } from "next/cache";
import { findOrCreateParent } from "./find-or-create-parent";

export async function createMember(
  input: CreateMemberInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireMonitor();

    // Validate input
    const parsed = createMemberSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const data = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      // Collect parent IDs
      const parentIds: string[] = [];

      // Father
      if (data.father?.fullName) {
        const id = await findOrCreateParent(tx, session.clubId, {
          fullName: data.father.fullName,
          email: data.father.email,
          phone: data.father.phone,
          cpf: data.father.cpf,
          profession: data.father.profession,
          relationship: "PAI",
          sex: "MASCULINO",
        });
        parentIds.push(id);
      }

      // Mother
      if (data.mother?.fullName) {
        const id = await findOrCreateParent(tx, session.clubId, {
          fullName: data.mother.fullName,
          email: data.mother.email,
          phone: data.mother.phone,
          cpf: data.mother.cpf,
          profession: data.mother.profession,
          relationship: "MAE",
          sex: "FEMININO",
        });
        parentIds.push(id);
      }

      // Guardians (RESPONSAVEL)
      if (data.guardians && data.guardians.length > 0) {
        for (const g of data.guardians) {
          const id = await findOrCreateParent(tx, session.clubId, {
            fullName: g.fullName,
            email: g.email,
            phone: g.phone,
            cpf: g.cpf,
            profession: g.profession,
            relationship: "RESPONSAVEL",
            sex: g.sex,
          });
          parentIds.push(id);
        }
      }

      // Create the member
      const member = await tx.member.create({
        data: {
          clubId: session.clubId,
          fullName: data.fullName,
          birthDate: new Date(data.birthDate),
          address: data.address || null,
          groupType: data.groupType,
          status: "ATIVO",
          enrollmentDate: data.enrollmentDate
            ? new Date(data.enrollmentDate)
            : new Date(),
          preceptorId: data.preceptorId || null,
        },
      });

      // Create MemberModule records
      for (const moduleType of data.modules) {
        await tx.memberModule.create({
          data: {
            memberId: member.id,
            moduleType,
          },
        });
      }

      // Create MemberParent links (deduplicated)
      const uniqueParentIds = [...new Set(parentIds)];
      for (const parentId of uniqueParentIds) {
        await tx.memberParent.create({
          data: {
            memberId: member.id,
            parentId,
          },
        });
      }

      return member;
    });

    revalidatePath("/socios");
    return { success: true, data: { id: result.id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao criar sócio.";
    return { success: false, error: message };
  }
}
