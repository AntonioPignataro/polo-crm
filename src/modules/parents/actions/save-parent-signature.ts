"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession, type ActionResult } from "@/lib/auth-utils";
import { parseSignatures } from "@/modules/members/lib/signatures";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const signaturePayloadSchema = z.object({
  memberId: z.string().min(1),
  signature: z.string().min(1, "Assinatura é obrigatória."),
  signerName: z.string().min(1, "Nome do responsável é obrigatório."),
  signerCpf: z.string().min(1, "CPF do responsável é obrigatório."),
  signerRelationship: z.string().min(1, "Parentesco é obrigatório."),
});

export type SignaturePayload = z.infer<typeof signaturePayloadSchema>;

/**
 * Save the parent's e-signature for a child member.
 * Called from the blocking parent signature screen.
 * Merges with any existing enrollmentFormUrl data.
 */
export async function saveParentSignature(
  payload: SignaturePayload
): Promise<ActionResult<{ memberId: string }>> {
  try {
    const session = await getRequiredSession();

    const parsed = signaturePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    // Verify the parent actually has this child
    if (!session.parentId) {
      return { success: false, error: "Usuário não é responsável." };
    }

    const parent = await prisma.parent.findUnique({
      where: { userId: session.userId },
      select: {
        id: true,
        memberParents: {
          where: { memberId: parsed.data.memberId },
          select: { id: true },
        },
      },
    });

    if (!parent || parent.memberParents.length === 0) {
      return { success: false, error: "Sócio não vinculado a este responsável." };
    }

    // Fetch existing member data
    const member = await prisma.member.findFirst({
      where: {
        id: parsed.data.memberId,
        clubId: session.clubId,
      },
    });

    if (!member) {
      return { success: false, error: "Sócio não encontrado." };
    }

    // Record THIS parent's signature in the per-parent map, keyed by Parent.id,
    // preserving any signatures already collected from the other parent(s).
    const signatures = parseSignatures(member.enrollmentFormUrl);
    signatures[parent.id] = {
      signature: parsed.data.signature,
      signerName: parsed.data.signerName,
      signerCpf: parsed.data.signerCpf,
      signerRelationship: parsed.data.signerRelationship,
      signedAt: new Date().toISOString(),
      signedByUserId: session.userId,
    };

    await prisma.member.update({
      where: { id: parsed.data.memberId },
      data: {
        enrollmentFormUrl: JSON.stringify({ signatures }),
      },
    });

    revalidatePath("/");
    return { success: true, data: { memberId: parsed.data.memberId } };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao salvar assinatura.";
    return { success: false, error: message };
  }
}
