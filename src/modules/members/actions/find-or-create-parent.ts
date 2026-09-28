import type { Prisma, ParentRelationship, Sex } from "@/generated/prisma/client";

// Interactive-transaction client type, derived from the type (not the singleton
// instance) so this module has no runtime dependency on the Prisma client.
export type PrismaTx = Prisma.TransactionClient;

/**
 * Find an existing Parent by email in the club, or create a new one.
 * Also performs bi-directional linking: if a User with that email already
 * exists in the club, links the Parent to that User.
 *
 * Shared by createMember and saveMemberEdit so both dedupe parents the same way.
 */
export async function findOrCreateParent(
  tx: PrismaTx,
  clubId: string,
  data: {
    fullName: string;
    email: string;
    phone?: string | null;
    cpf?: string | null;
    profession?: string | null;
    relationship: ParentRelationship;
    sex: Sex;
  }
): Promise<string> {
  const normalizedEmail = data.email.toLowerCase().trim();

  // Check for existing parent with this email in this club
  const existing = await tx.parent.findFirst({
    where: {
      email: normalizedEmail,
      memberParents: {
        some: {
          member: { clubId },
        },
      },
    },
    select: { id: true, userId: true },
  });

  if (existing) {
    // If existing parent has no user linked yet, try bi-directional link
    if (!existing.userId) {
      const matchingUser = await tx.user.findUnique({
        where: { clubId_email: { clubId, email: normalizedEmail } },
        select: { id: true },
      });
      if (matchingUser) {
        await tx.parent.update({
          where: { id: existing.id },
          data: { userId: matchingUser.id },
        });
      }
    }
    return existing.id;
  }

  // Check bi-directional: does a User with this email already exist in the club?
  const matchingUser = await tx.user.findUnique({
    where: { clubId_email: { clubId, email: normalizedEmail } },
    select: { id: true },
  });

  // Create new Parent record (no User created)
  const parent = await tx.parent.create({
    data: {
      fullName: data.fullName,
      email: normalizedEmail,
      phone: data.phone || null,
      cpf: data.cpf || null,
      profession: data.profession || null,
      relationship: data.relationship,
      sex: data.sex,
      // Bi-directional link: connect to existing User if found
      userId: matchingUser?.id ?? undefined,
    },
  });

  return parent.id;
}
