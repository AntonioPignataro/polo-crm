import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import { hash } from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter }) as unknown as InstanceType<typeof PrismaClient>;

async function setup() {
  console.log("🏗️  Setting up club and super admin...\n");

  // 1. Create club
  const club = await prisma.club.create({
    data: {
      name: "Clube Polo",
      slug: "clube-polo",
      isActive: true,
      settings: {
        defaultModule: "SABADO",
      },
    },
  });
  console.log(`✅ Club created: ${club.name} (id: ${club.id})`);

  // 2. Create super admin user
  const passwordHash = await hash("admin123", 12);
  const admin = await prisma.user.create({
    data: {
      clubId: club.id,
      email: "diretor@clubepolo.com",
      passwordHash,
      name: "Diretor",
      role: "DIRETOR",
      isActive: true,
    },
  });
  console.log(`✅ Admin created: ${admin.name} (${admin.email})`);

  console.log("\n🔑 Login credentials:");
  console.log(`   Club slug: clube-polo`);
  console.log(`   Email: diretor@clubepolo.com`);
  console.log(`   Password: admin123`);
  console.log("\n⚠️  Change the password after first login!");
}

setup()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
