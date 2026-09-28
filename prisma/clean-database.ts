import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function cleanDatabase() {
  console.log("🗑️  Cleaning database (preserving schema)...\n");

  // Delete in FK-dependency order: leaf tables first, root tables last

  // 1. Leaf tables (no FK references pointing to them)
  const step1 = await Promise.all([
    prisma.notification.deleteMany().then((r) => ({ notifications: r.count })),
    prisma.attendanceRecord.deleteMany().then((r) => ({ attendanceRecords: r.count })),
    prisma.priestQueue.deleteMany().then((r) => ({ priestQueue: r.count })),
    prisma.polarEntry.deleteMany().then((r) => ({ polarEntries: r.count })),
    prisma.bookLoan.deleteMany().then((r) => ({ bookLoans: r.count })),
    prisma.studyHour.deleteMany().then((r) => ({ studyHours: r.count })),
    prisma.appointment.deleteMany().then((r) => ({ appointments: r.count })),
    prisma.activityRegistration.deleteMany().then((r) => ({ activityRegistrations: r.count })),
    prisma.parentFormationAttendance.deleteMany().then((r) => ({ parentFormationAttendance: r.count })),
    prisma.calendarEvent.deleteMany().then((r) => ({ calendarEvents: r.count })),
    prisma.polarConfig.deleteMany().then((r) => ({ polarConfigs: r.count })),
    prisma.calendarNotificationQueue.deleteMany().then((r) => ({ calendarNotificationQueue: r.count })),
    prisma.memberModule.deleteMany().then((r) => ({ memberModules: r.count })),
  ]);
  console.log("Step 1 (leaf tables):", step1);

  // 2. Mid-level tables
  const step2 = await Promise.all([
    prisma.attendanceSession.deleteMany().then((r) => ({ attendanceSessions: r.count })),
    prisma.book.deleteMany().then((r) => ({ books: r.count })),
    prisma.parentFormation.deleteMany().then((r) => ({ parentFormations: r.count })),
    prisma.activity.deleteMany().then((r) => ({ activities: r.count })),
    prisma.memberParent.deleteMany().then((r) => ({ memberParents: r.count })),
  ]);
  console.log("Step 2 (mid-level):", step2);

  // 3. Parent + Member (Parent has FK to User, Member has FK to User)
  const step3a = await prisma.parent.deleteMany();
  console.log("Step 3a (parents):", step3a.count);

  const step3b = await prisma.member.deleteMany();
  console.log("Step 3b (members):", step3b.count);

  // 4. Users
  const step4 = await prisma.user.deleteMany();
  console.log("Step 4 (users):", step4.count);

  // 5. Clubs
  const step5 = await prisma.club.deleteMany();
  console.log("Step 5 (clubs):", step5.count);

  console.log("\n✅ Database cleaned successfully!");
}

cleanDatabase()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
