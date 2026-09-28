/**
 * Data migration: Clean up auto-created Users for parents.
 *
 * Previously, `createMember` auto-created a User (with random password) for
 * each parent. Now parents self-register, so we need to:
 *
 * 1. Unlink Parent.userId for all parents that were auto-created
 * 2. Delete the auto-created User records (they had role PAI/USUARIO)
 * 3. Cascade-delete Notifications that reference those Users
 *
 * Run: npx tsx prisma/migrate-parents.ts
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter }) as unknown as InstanceType<
  typeof PrismaClient
>;

async function main() {
  console.log("Starting parent data migration...\n");

  // Find all Parent records that have a linked User
  const linkedParents = await prisma.parent.findMany({
    where: { userId: { not: null } },
    select: {
      id: true,
      fullName: true,
      email: true,
      userId: true,
      user: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (linkedParents.length === 0) {
    console.log("No linked parents found. Nothing to migrate.");
    return;
  }

  console.log(`Found ${linkedParents.length} Parent(s) with linked Users:\n`);
  for (const p of linkedParents) {
    console.log(
      `  - Parent "${p.fullName}" (${p.email}) → User ${p.user?.email} [${p.user?.role}]`
    );
  }

  // Collect the User IDs to delete
  const userIdsToDelete = linkedParents
    .map((p) => p.userId)
    .filter((id): id is string => id !== null);

  const uniqueUserIds = [...new Set(userIdsToDelete)];

  console.log(`\nWill unlink ${linkedParents.length} Parent(s) and delete ${uniqueUserIds.length} User(s).\n`);

  // Execute in a transaction
  await prisma.$transaction(async (tx) => {
    // 1. Delete Notifications referencing these Users (FK constraint)
    const deletedNotifications = await tx.notification.deleteMany({
      where: { recipientId: { in: uniqueUserIds } },
    });
    console.log(`Deleted ${deletedNotifications.count} notification(s).`);

    // 2. Unlink all Parent.userId
    for (const parent of linkedParents) {
      await tx.parent.update({
        where: { id: parent.id },
        data: { userId: null },
      });
    }
    console.log(`Unlinked ${linkedParents.length} Parent record(s).`);

    // 3. Delete the auto-created Users
    const deletedUsers = await tx.user.deleteMany({
      where: { id: { in: uniqueUserIds } },
    });
    console.log(`Deleted ${deletedUsers.count} User(s).`);
  });

  console.log("\nMigration complete!");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
