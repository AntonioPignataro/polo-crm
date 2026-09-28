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

async function seed() {
  console.log("🌱 Seeding test data...\n");

  // Find the club
  const club = await prisma.club.findFirst({ where: { slug: "polo-santa-cruz" } });
  if (!club) {
    console.error("❌ Club not found. Run setup-club.ts first.");
    process.exit(1);
  }

  const passwordHash = await hash("preceptor123", 12);

  // Create 2 preceptor users
  const preceptor1 = await prisma.user.upsert({
    where: { clubId_email: { clubId: club.id, email: "carlos@polo.com" } },
    update: {},
    create: {
      clubId: club.id,
      email: "carlos@polo.com",
      passwordHash,
      name: "Carlos Mendes",
      role: "PRECEPTOR",
      isActive: true,
    },
  });
  console.log(`✅ Preceptor 1: ${preceptor1.name} (${preceptor1.email})`);

  const preceptor2 = await prisma.user.upsert({
    where: { clubId_email: { clubId: club.id, email: "rafael@polo.com" } },
    update: {},
    create: {
      clubId: club.id,
      email: "rafael@polo.com",
      passwordHash,
      name: "Rafael Oliveira",
      role: "PRECEPTOR",
      isActive: true,
    },
  });
  console.log(`✅ Preceptor 2: ${preceptor2.name} (${preceptor2.email})`);

  // Create 5 members — 3 assigned to preceptor1, 2 to preceptor2
  const members = [
    { fullName: "Lucas Silva",     birthDate: "2012-03-15", groupType: "G1", modules: ["SABADO"] as ("QUINTA" | "SEXTA" | "SABADO")[],  preceptorId: preceptor1.id },
    { fullName: "Pedro Almeida",   birthDate: "2011-07-22", groupType: "G1", modules: ["SEXTA"] as ("QUINTA" | "SEXTA" | "SABADO")[],   preceptorId: preceptor1.id },
    { fullName: "Matheus Costa",   birthDate: "2010-11-03", groupType: "G2", modules: ["SABADO"] as ("QUINTA" | "SEXTA" | "SABADO")[],  preceptorId: preceptor1.id },
    { fullName: "Gabriel Santos",  birthDate: "2013-01-10", groupType: "G2", modules: ["SEXTA", "SABADO"] as ("QUINTA" | "SEXTA" | "SABADO")[],   preceptorId: preceptor2.id },
    { fullName: "Henrique Lima",   birthDate: "2012-09-28", groupType: "G3", modules: ["QUINTA"] as ("QUINTA" | "SEXTA" | "SABADO")[],  preceptorId: preceptor2.id },
  ];

  for (const m of members) {
    const member = await prisma.member.create({
      data: {
        clubId: club.id,
        fullName: m.fullName,
        birthDate: new Date(m.birthDate),
        groupType: m.groupType as "G1" | "G2" | "G3",
        status: "ATIVO",
        preceptorId: m.preceptorId,
        enrollmentDate: new Date(),
      },
    });

    // Create MemberModule records
    for (const moduleType of m.modules) {
      await prisma.memberModule.create({
        data: {
          memberId: member.id,
          moduleType,
        },
      });
    }

    const preceptorName = m.preceptorId === preceptor1.id ? preceptor1.name : preceptor2.name;
    console.log(`✅ Member: ${member.fullName} (${m.groupType}/${m.modules.join(",")}) → ${preceptorName}`);
  }

  console.log("\n🔑 Preceptor login credentials:");
  console.log("   Email: carlos@polo.com  |  Password: preceptor123");
  console.log("   Email: rafael@polo.com  |  Password: preceptor123");
  console.log("\n📋 Members assigned:");
  console.log("   Carlos Mendes → Lucas Silva, Pedro Almeida, Matheus Costa");
  console.log("   Rafael Oliveira → Gabriel Santos, Henrique Lima");
}

seed()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
