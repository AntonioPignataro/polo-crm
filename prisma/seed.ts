import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import { hash } from "bcryptjs";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter }) as unknown as InstanceType<typeof PrismaClient>;

async function main() {
  console.log("Seeding database...");

  // 1. Create club
  const club = await prisma.club.upsert({
    where: { slug: "polo-exemplo" },
    update: {},
    create: {
      name: "Polo Exemplo",
      slug: "polo-exemplo",
      isActive: true,
      settings: {
        defaultModule: "SABADO",
      },
    },
  });
  console.log(`Club created: ${club.name} (${club.id})`);

  // 2. Create director user
  const directorPassword = await hash("admin123", 12);
  const director = await prisma.user.upsert({
    where: { clubId_email: { clubId: club.id, email: "diretor@polo.com" } },
    update: {},
    create: {
      clubId: club.id,
      email: "diretor@polo.com",
      passwordHash: directorPassword,
      name: "Antonio Pignataro",
      role: "DIRETOR",
      phone: "(11) 99999-0001",
      isActive: true,
    },
  });
  console.log(`Director created: ${director.name} (${director.email})`);

  // 3. Create preceptors
  const preceptorPassword = await hash("preceptor123", 12);

  const preceptor1 = await prisma.user.upsert({
    where: { clubId_email: { clubId: club.id, email: "carlos@polo.com" } },
    update: {},
    create: {
      clubId: club.id,
      email: "carlos@polo.com",
      passwordHash: preceptorPassword,
      name: "Carlos Eduardo Lima",
      role: "PRECEPTOR",
      phone: "(11) 99876-5432",
      isActive: true,
    },
  });

  const preceptor2 = await prisma.user.upsert({
    where: { clubId_email: { clubId: club.id, email: "roberto@polo.com" } },
    update: {},
    create: {
      clubId: club.id,
      email: "roberto@polo.com",
      passwordHash: preceptorPassword,
      name: "Roberto Fernandes",
      role: "PRECEPTOR",
      phone: "(11) 98765-4321",
      isActive: true,
    },
  });

  const preceptor3 = await prisma.user.upsert({
    where: { clubId_email: { clubId: club.id, email: "andre@polo.com" } },
    update: {},
    create: {
      clubId: club.id,
      email: "andre@polo.com",
      passwordHash: preceptorPassword,
      name: "Andre Marques da Silva",
      role: "PRECEPTOR",
      phone: "(11) 97654-3210",
      isActive: true,
    },
  });

  console.log(`Preceptors created: ${preceptor1.name}, ${preceptor2.name}, ${preceptor3.name}`);

  // 4. Create members (socios)
  const membersData = [
    { fullName: "Maria Clara Silva", birthDate: new Date("2013-03-15"), groupType: "G1" as const, modules: ["SEXTA"] as ("QUINTA" | "SEXTA" | "SABADO")[], preceptorId: preceptor1.id },
    { fullName: "Pedro Henrique Oliveira", birthDate: new Date("2012-07-22"), groupType: "G2" as const, modules: ["SABADO"] as ("QUINTA" | "SEXTA" | "SABADO")[], preceptorId: preceptor1.id },
    { fullName: "Ana Beatriz Santos", birthDate: new Date("2013-11-08"), groupType: "G1" as const, modules: ["SEXTA", "SABADO"] as ("QUINTA" | "SEXTA" | "SABADO")[], preceptorId: preceptor1.id },
    { fullName: "Lucas Gabriel Ferreira", birthDate: new Date("2011-05-30"), groupType: "G3" as const, modules: ["QUINTA"] as ("QUINTA" | "SEXTA" | "SABADO")[], preceptorId: preceptor2.id },
    { fullName: "Julia Costa Pereira", birthDate: new Date("2012-09-14"), groupType: "G2" as const, modules: ["SABADO"] as ("QUINTA" | "SEXTA" | "SABADO")[], preceptorId: preceptor1.id },
    { fullName: "Gabriel Almeida Lima", birthDate: new Date("2013-01-25"), groupType: "G1" as const, modules: ["SEXTA"] as ("QUINTA" | "SEXTA" | "SABADO")[], preceptorId: preceptor2.id },
    { fullName: "Sophia Rodrigues Martins", birthDate: new Date("2011-12-03"), groupType: "G3" as const, modules: ["QUINTA"] as ("QUINTA" | "SEXTA" | "SABADO")[], preceptorId: preceptor3.id },
    { fullName: "Enzo Souza Barbosa", birthDate: new Date("2012-04-18"), groupType: "G2" as const, modules: ["SABADO"] as ("QUINTA" | "SEXTA" | "SABADO")[], preceptorId: preceptor1.id },
    { fullName: "Valentina Nascimento", birthDate: new Date("2013-08-07"), groupType: "G1" as const, modules: ["SEXTA"] as ("QUINTA" | "SEXTA" | "SABADO")[], preceptorId: preceptor3.id },
    { fullName: "Davi Ribeiro Araujo", birthDate: new Date("2011-10-20"), groupType: "G3" as const, modules: ["QUINTA"] as ("QUINTA" | "SEXTA" | "SABADO")[], preceptorId: preceptor2.id },
    { fullName: "Isabella Rodrigues", birthDate: new Date("2012-06-11"), groupType: "G2" as const, modules: ["SEXTA", "SABADO"] as ("QUINTA" | "SEXTA" | "SABADO")[], preceptorId: preceptor3.id },
    { fullName: "Rafael dos Santos", birthDate: new Date("2011-02-28"), groupType: "G3" as const, modules: ["QUINTA"] as ("QUINTA" | "SEXTA" | "SABADO")[], preceptorId: preceptor3.id },
  ];

  for (const data of membersData) {
    const member = await prisma.member.create({
      data: {
        clubId: club.id,
        fullName: data.fullName,
        birthDate: data.birthDate,
        groupType: data.groupType,
        status: "ATIVO",
        enrollmentDate: new Date("2025-02-01"),
        preceptorId: data.preceptorId,
      },
    });

    // Create MemberModule records
    for (const moduleType of data.modules) {
      await prisma.memberModule.create({
        data: {
          memberId: member.id,
          moduleType,
        },
      });
    }
  }
  console.log(`Members created: ${membersData.length} socios`);

  // 5. Create polar configs
  const polarConfigs = [
    { category: "PRESENCA" as const, defaultPoints: 30, description: "Presenca no dia de atividade" },
    { category: "PONTUALIDADE" as const, defaultPoints: 20, description: "Chegou no horario" },
    { category: "AMIGO" as const, defaultPoints: 20, description: "Comportamento amigavel" },
    { category: "ESPORTE" as const, defaultPoints: 20, description: "Participacao esportiva" },
    { category: "ENCARGO" as const, defaultPoints: 20, description: "Cumpriu encargo designado" },
    { category: "MULTA" as const, defaultPoints: -20, description: "Penalidade por mau comportamento" },
    { category: "LIVRO" as const, defaultPoints: 60, description: "Leitura e devolucao de livro" },
    { category: "BOLETIM" as const, defaultPoints: 100, description: "Bom desempenho escolar" },
  ];

  for (const config of polarConfigs) {
    await prisma.polarConfig.upsert({
      where: { clubId_category: { clubId: club.id, category: config.category } },
      update: {},
      create: {
        clubId: club.id,
        category: config.category,
        defaultPoints: config.defaultPoints,
        description: config.description,
      },
    });
  }
  console.log(`Polar configs created: ${polarConfigs.length} categories`);

  // 6. Create some books
  const booksData = [
    { title: "O Pequeno Principe", author: "Antoine de Saint-Exupery" },
    { title: "A Ilha do Tesouro", author: "Robert Louis Stevenson" },
    { title: "Dom Quixote", author: "Miguel de Cervantes" },
    { title: "O Hobbit", author: "J.R.R. Tolkien" },
    { title: "As Cronicas de Narnia", author: "C.S. Lewis" },
    { title: "A Historia Sem Fim", author: "Michael Ende" },
    { title: "Meu Pe de Laranja Lima", author: "Jose Mauro de Vasconcelos" },
    { title: "Robinson Crusoe", author: "Daniel Defoe" },
    { title: "A Volta ao Mundo em 80 Dias", author: "Julio Verne" },
    { title: "O Morro dos Ventos Uivantes", author: "Emily Bronte" },
  ];

  for (const book of booksData) {
    await prisma.book.create({
      data: {
        clubId: club.id,
        title: book.title,
        author: book.author,
        status: "DISPONIVEL",
      },
    });
  }
  console.log(`Books created: ${booksData.length} livros`);

  // 7. Fetch created members for seeding relations
  const members = await prisma.member.findMany({
    where: { clubId: club.id },
    orderBy: { fullName: "asc" },
  });

  // 8. Create appointments
  const appointmentsData = [
    { memberId: members[0].id, date: new Date("2025-01-28"), type: "SACERDOTE" as const, conductedBy: director.id },
    { memberId: members[1].id, date: new Date("2025-01-27"), type: "PRECEPTORIA_SOCIO" as const, conductedBy: preceptor1.id },
    { memberId: members[2].id, date: new Date("2025-01-27"), type: "PRECEPTORIA_PAIS" as const, conductedBy: preceptor2.id },
    { memberId: members[3].id, date: new Date("2025-01-25"), type: "SACERDOTE" as const, conductedBy: director.id },
    { memberId: members[4].id, date: new Date("2025-01-25"), type: "PRECEPTORIA_SOCIO" as const, conductedBy: preceptor1.id },
    { memberId: members[5].id, date: new Date("2025-01-24"), type: "PRECEPTORIA_PAIS" as const, conductedBy: preceptor2.id },
    { memberId: members[6].id, date: new Date("2025-01-22"), type: "SACERDOTE" as const, conductedBy: director.id },
    { memberId: members[7].id, date: new Date("2025-01-20"), type: "PRECEPTORIA_SOCIO" as const, conductedBy: preceptor1.id },
  ];

  for (const appt of appointmentsData) {
    await prisma.appointment.create({ data: appt });
  }
  console.log(`Appointments created: ${appointmentsData.length}`);

  // 9. Create activities
  const activitiesData = [
    {
      name: "Acampamento Serra da Mantiqueira",
      description: "Acampamento de 3 dias na Serra da Mantiqueira com trilhas, fogueira e atividades ao ar livre.",
      startDate: new Date("2025-03-15"),
      endDate: new Date("2025-03-17"),
      status: "INSCRICOES_ABERTAS" as const,
      costPerPerson: 250,
    },
    {
      name: "Gincana de Verao",
      description: "Gincana com diversas provas esportivas e culturais entre as equipes do clube.",
      startDate: new Date("2025-02-22"),
      endDate: new Date("2025-02-22"),
      status: "INSCRICOES_ENCERRADAS" as const,
      costPerPerson: 0,
    },
    {
      name: "Visita ao Museu do Ipiranga",
      description: "Visita guiada ao Museu do Ipiranga sobre a historia do Brasil.",
      startDate: new Date("2025-04-12"),
      endDate: new Date("2025-04-12"),
      status: "PLANEJADA" as const,
      costPerPerson: 45,
    },
    {
      name: "Torneio de Futebol Inter-Clubes",
      description: "Torneio de futebol entre clubes da regiao. Participacao dos times sub-12 e sub-15.",
      startDate: new Date("2024-11-16"),
      endDate: new Date("2024-11-16"),
      status: "CONCLUIDA" as const,
      costPerPerson: 20,
    },
  ];

  for (const act of activitiesData) {
    const activity = await prisma.activity.create({
      data: {
        clubId: club.id,
        name: act.name,
        description: act.description,
        startDate: act.startDate,
        endDate: act.endDate,
        status: act.status,
        costPerPerson: act.costPerPerson,
        createdBy: director.id,
      },
    });

    // Add registrations to first 2 activities
    if (act.status === "INSCRICOES_ABERTAS" || act.status === "INSCRICOES_ENCERRADAS") {
      const numRegistrations = act.status === "INSCRICOES_ABERTAS" ? 5 : 8;
      for (let i = 0; i < Math.min(numRegistrations, members.length); i++) {
        await prisma.activityRegistration.create({
          data: {
            activityId: activity.id,
            memberId: members[i].id,
            participantName: members[i].fullName,
            registeredBy: director.id,
          },
        });
      }
    }
  }
  console.log(`Activities created: ${activitiesData.length}`);

  // 10. Create calendar events
  const calendarEventsData = [
    { title: "Clube Regular - Sexta", date: new Date("2025-01-03"), eventType: "CLUBE_REGULAR" as const },
    { title: "Clube Regular - Sabado", date: new Date("2025-01-04"), eventType: "CLUBE_REGULAR" as const },
    { title: "Clube Regular - Sexta", date: new Date("2025-01-10"), eventType: "CLUBE_REGULAR" as const },
    { title: "Clube Regular - Sabado", date: new Date("2025-01-11"), eventType: "CLUBE_REGULAR" as const },
    { title: "Formacao de Pais: Educacao Digital", date: new Date("2025-01-18"), eventType: "FORMACAO_PAIS" as const, description: "Palestra com Dr. Ricardo Mendes" },
    { title: "Clube Regular - Sexta", date: new Date("2025-01-17"), eventType: "CLUBE_REGULAR" as const },
    { title: "Clube Regular - Sabado", date: new Date("2025-01-18"), eventType: "CLUBE_REGULAR" as const },
    { title: "Clube Regular - Sexta", date: new Date("2025-01-24"), eventType: "CLUBE_REGULAR" as const },
    { title: "Clube Regular - Sabado", date: new Date("2025-01-25"), eventType: "CLUBE_REGULAR" as const },
    { title: "Gincana de Verao", date: new Date("2025-02-22"), eventType: "ATIVIDADE_EXTERNA" as const, description: "Gincana esportiva e cultural na sede" },
    { title: "Carnaval", date: new Date("2025-03-03"), eventType: "SEM_ATIVIDADE" as const },
    { title: "Carnaval", date: new Date("2025-03-04"), eventType: "SEM_ATIVIDADE" as const },
    { title: "Acampamento Serra da Mantiqueira", date: new Date("2025-03-15"), eventType: "ATIVIDADE_EXTERNA" as const, description: "Acampamento de 3 dias na serra" },
    { title: "Sexta-Feira Santa", date: new Date("2025-04-18"), eventType: "SEM_ATIVIDADE" as const },
    { title: "Tiradentes", date: new Date("2025-04-21"), eventType: "SEM_ATIVIDADE" as const },
    { title: "Dia do Trabalho", date: new Date("2025-05-01"), eventType: "SEM_ATIVIDADE" as const },
    { title: "Corpus Christi", date: new Date("2025-06-19"), eventType: "SEM_ATIVIDADE" as const },
    { title: "Festa Junina do Clube", date: new Date("2025-06-21"), eventType: "ATIVIDADE_EXTERNA" as const, description: "Festa junina com barracas e brincadeiras" },
    { title: "Encerramento 1o Semestre", date: new Date("2025-06-28"), eventType: "CLUBE_REGULAR" as const },
  ];

  for (const ev of calendarEventsData) {
    await prisma.calendarEvent.create({
      data: {
        clubId: club.id,
        semester: "2025.1",
        title: ev.title,
        date: ev.date,
        eventType: ev.eventType,
        description: (ev as { description?: string }).description ?? null,
        createdBy: director.id,
      },
    });
  }
  console.log(`Calendar events created: ${calendarEventsData.length}`);

  // 12. Create parent formations
  const formationsData = [
    { name: "Educacao dos Filhos na Era Digital", type: "FORMACAO_PAI" as const, date: new Date("2025-01-18") },
    { name: "Comunicacao no Casamento", type: "FORMACAO_CASAL" as const, date: new Date("2025-01-11") },
    { name: "Virtudes e Formacao do Carater", type: "FORMACAO_PAI" as const, date: new Date("2024-12-14") },
  ];

  for (const form of formationsData) {
    await prisma.parentFormation.create({
      data: {
        clubId: club.id,
        name: form.name,
        type: form.type,
        date: form.date,
      },
    });
  }
  console.log(`Parent formations created: ${formationsData.length}`);

  // 13. Create study hours
  const studyWeeks = [
    new Date("2025-03-03"),
    new Date("2025-03-10"),
    new Date("2025-03-17"),
    new Date("2025-03-24"),
    new Date("2025-03-31"),
    new Date("2025-04-07"),
    new Date("2025-04-14"),
    new Date("2025-04-21"),
  ];

  for (const member of members.slice(0, 8)) {
    for (const weekStart of studyWeeks) {
      const hours = Math.round((Math.random() * 3 + 0.5) * 2) / 2; // 0.5 to 3.5 in 0.5 steps
      await prisma.studyHour.create({
        data: {
          memberId: member.id,
          weekStart,
          hours,
          registeredBy: director.id,
        },
      });
    }
  }
  console.log(`Study hours created for 8 members x ${studyWeeks.length} weeks`);

  console.log("\nSeed completed!");
  console.log("\nLogin credentials:");
  console.log("  Diretor:    diretor@polo.com / admin123");
  console.log("  Preceptor:  carlos@polo.com / preceptor123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
