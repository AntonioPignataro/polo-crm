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
const prisma = new PrismaClient({ adapter }) as unknown as InstanceType<typeof PrismaClient>;

interface EventInput {
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  eventType: "CLUBE_REGULAR" | "ATIVIDADE_EXTERNA" | "FORMACAO_PAIS" | "SEM_ATIVIDADE" | "OUTROS";
  startTime?: string;
  endTime?: string;
}

const SEMESTER = "2026.1";

// ==============================
// MARCH 2026
// ==============================
const marchEvents: EventInput[] = [
  // Week 1
  { date: "2026-03-05", title: "MIND — Leitura: Antropologia: O itinerário dos amores", description: "Espiritual: Terço. G3 – Leitura e discussão.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
  { date: "2026-03-06", title: "Oficina Cultural — Apresentação: Mercado financeiro e de capitais", description: "Espiritual: Terço. G1/G2 – Abertura do semestre com sorteio de temas.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
  { date: "2026-03-07", title: "Sem atividades programadas", description: "Ausência de monitores.", eventType: "OUTROS", startTime: "09:00", endTime: "12:00" },

  // Week 2
  { date: "2026-03-12", title: "MIND — Debate: Antropologia: O itinerário dos amores", description: "Espiritual: Oração. G3 – Debate sobre a leitura.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
  { date: "2026-03-13", title: "Oficina Cultural — Juros compostos e noções básicas de juros", description: "Espiritual: Oração. G1/G2.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
  { date: "2026-03-14", title: "Formação garotos — G1: O clube / G2: O clube", description: "Oficina. Sacerdote: NÃO.", eventType: "CLUBE_REGULAR", startTime: "09:00", endTime: "12:00" },
  { date: "2026-03-14", title: "Palestra Pai — Presença de Deus", description: "Formação de pais (homens). IBF: NÃO.", eventType: "FORMACAO_PAIS", startTime: "11:00", endTime: "12:00" },

  // Week 3
  { date: "2026-03-19", title: "MIND — Leitura: Os quatro amores: Ágape", description: "Espiritual: Terço. G3 – Leitura.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
  { date: "2026-03-20", title: "Oficina Cultural — Alugar x comprar uma casa", description: "Espiritual: Terço. G1/G2.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
  { date: "2026-03-21", title: "Formação garotos — G1: 01-11 / G2: 01-26", description: "Oficina.", eventType: "CLUBE_REGULAR", startTime: "09:00", endTime: "12:00" },
  { date: "2026-03-21", title: "Formação IBF — Caso 1: Revisão teórica + discussão em grupo", description: "Curso Pré-Adolescência (casal). Palestra Pai: NÃO.", eventType: "FORMACAO_PAIS", startTime: "11:00", endTime: "12:00" },

  // Week 4
  { date: "2026-03-26", title: "MIND — Debate: Os quatro amores: Ágape", description: "Espiritual: Oração. G3 – Debate.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
  { date: "2026-03-27", title: "Oficina Cultural — Noções básicas sobre inflação", description: "Espiritual: Oração. G1/G2.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
  { date: "2026-03-28", title: "Formação garotos — G1: 12-22 / G2: 27-52", description: "Sacerdote. Meditação e confissão.", eventType: "CLUBE_REGULAR", startTime: "09:00", endTime: "12:00" },
  { date: "2026-03-28", title: "Formação IBF — Caso 1: Plenária", description: "Curso Pré-Adolescência (casal). Palestra Pai: NÃO.", eventType: "FORMACAO_PAIS", startTime: "11:00", endTime: "12:00" },
];

// ==============================
// APRIL 2026
// ==============================
const aprilEvents: EventInput[] = [
  // Week 1 — Semana Santa
  { date: "2026-04-02", title: "Instituição da Eucaristia", description: "Sem atividades programadas.", eventType: "SEM_ATIVIDADE" },
  { date: "2026-04-03", title: "Sexta-Feira Santa", description: "Sem atividades programadas.", eventType: "SEM_ATIVIDADE" },
  { date: "2026-04-04", title: "Sábado Santo", description: "Sem atividades programadas.", eventType: "SEM_ATIVIDADE" },

  // Week 2
  { date: "2026-04-09", title: "MIND — Leitura: Algo grande que seja amor (cap. 6)", description: "Espiritual: Terço. G3 – Leitura.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
  { date: "2026-04-10", title: "Oficina Cultural — Cenários de inflação", description: "Espiritual: Terço. G1/G2.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
  { date: "2026-04-11", title: "Formação garotos — Meditação", description: "Sacerdote. Meditação e confissão.", eventType: "CLUBE_REGULAR", startTime: "09:00", endTime: "12:00" },
  { date: "2026-04-11", title: "Palestra Pai — Confissão", description: "Formação de pais (homens). IBF: NÃO.", eventType: "FORMACAO_PAIS", startTime: "11:00", endTime: "12:00" },

  // Week 3
  { date: "2026-04-16", title: "MIND — Debate: Algo grande que seja amor (cap. 6)", description: "Espiritual: Oração. G3 – Debate.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
  { date: "2026-04-17", title: "Oficina Cultural — Introdução às ações", description: "Espiritual: Oração. G1/G2.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
  { date: "2026-04-18", title: "Excursão Pai & Filho — Faxinal", description: "Atividade especial. Dia inteiro.", eventType: "ATIVIDADE_EXTERNA", startTime: "08:00", endTime: "18:00" },

  // Week 4
  { date: "2026-04-23", title: "MIND — Estudo individual: Documentário Pedro Ballester", description: "Espiritual: Terço. G3 – Assistir em casa.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
  { date: "2026-04-24", title: "Oficina Cultural — Métricas corporativas e avaliação de valor", description: "Espiritual: Terço. G1/G2.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
  { date: "2026-04-25", title: "Formação garotos — G1/G2: Amizade e apostolado", description: "Oficina.", eventType: "CLUBE_REGULAR", startTime: "09:00", endTime: "12:00" },
  { date: "2026-04-25", title: "Formação IBF — Caso 2: Revisão teórica + discussão em grupo", description: "Curso Pré-Adolescência (casal). Palestra Pai: NÃO.", eventType: "FORMACAO_PAIS", startTime: "11:00", endTime: "12:00" },

  // Week 5
  { date: "2026-04-29", title: "Visita aos Pobres", description: "Atividade social (quarta-feira).", eventType: "ATIVIDADE_EXTERNA", startTime: "14:00", endTime: "17:00" },
  { date: "2026-04-30", title: "MIND — Debate: Pedro Ballester", description: "Espiritual: Oração. G3 – Debate sobre documentário.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
];

// ==============================
// MAY 2026
// ==============================
const mayEvents: EventInput[] = [
  // Week 1
  { date: "2026-05-01", title: "Dia do Trabalhador", description: "Sem atividades programadas.", eventType: "SEM_ATIVIDADE" },
  { date: "2026-05-02", title: "Ação Social — Visita aos Enfermos do HU", description: "Atividade social.", eventType: "ATIVIDADE_EXTERNA", startTime: "09:00", endTime: "12:00" },

  // Week 2
  { date: "2026-05-07", title: "MIND — Leitura: A vocação matrimonial", description: "Espiritual: Terço. G3 – Leitura.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
  { date: "2026-05-08", title: "Oficina Cultural — Feedback geral", description: "Espiritual: Oração. G1/G2.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
  { date: "2026-05-09", title: "Dia das Mães", description: "Sem atividades programadas.", eventType: "SEM_ATIVIDADE" },

  // Week 3
  { date: "2026-05-14", title: "MIND — Debate: A vocação matrimonial", description: "Espiritual: Oração. G3 – Debate.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
  { date: "2026-05-15", title: "Oficina Cultural — Vida de uma empresa: do nascimento à morte", description: "Espiritual: Terço. G1/G2.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
  { date: "2026-05-16", title: "Formação garotos — G1: 23-41 / G2: 53-78", description: "Oficina.", eventType: "CLUBE_REGULAR", startTime: "09:00", endTime: "12:00" },
  { date: "2026-05-16", title: "Formação IBF — Caso 2: Plenária", description: "Curso Pré-Adolescência (casal). Palestra Pai: NÃO.", eventType: "FORMACAO_PAIS", startTime: "11:00", endTime: "12:00" },

  // Week 4
  { date: "2026-05-21", title: "MIND — Leitura: Algo grande que seja amor (cap. 7)", description: "Espiritual: Terço. G3 – Leitura.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
  { date: "2026-05-22", title: "Oficina Cultural — Títulos", description: "Espiritual: Oração. G1/G2.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
  { date: "2026-05-23", title: "Sem atividades programadas", description: "Ausência de monitores.", eventType: "OUTROS", startTime: "09:00", endTime: "12:00" },

  // Week 5
  { date: "2026-05-28", title: "MIND — Debate: Algo grande que seja amor (cap. 7)", description: "Espiritual: Oração. G3 – Debate.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
  { date: "2026-05-29", title: "Oficina Cultural — Falência de empresas", description: "Espiritual: Terço. G1/G2.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
  { date: "2026-05-30", title: "Formação garotos — G1/G2: Ordem", description: "Oficina.", eventType: "CLUBE_REGULAR", startTime: "09:00", endTime: "12:00" },
  { date: "2026-05-30", title: "Palestra Pai — Tribulações", description: "Formação de pais (homens). IBF: NÃO.", eventType: "FORMACAO_PAIS", startTime: "11:00", endTime: "12:00" },
];

// ==============================
// JUNE 2026
// ==============================
const juneEvents: EventInput[] = [
  // Week 1
  { date: "2026-06-04", title: "Corpus Christi", description: "Sem atividades programadas.", eventType: "SEM_ATIVIDADE" },
  { date: "2026-06-05", title: "Oficina Cultural — Sistema bancário e monetário", description: "Espiritual: Oração. G1/G2.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
  { date: "2026-06-06", title: "Formação garotos — G1: 42-54 / G2: 79-104", description: "Oficina.", eventType: "CLUBE_REGULAR", startTime: "09:00", endTime: "12:00" },

  // Week 2
  { date: "2026-06-11", title: "MIND — Estudo individual: Filme 'A felicidade não se compra'", description: "Espiritual: Terço. G3 – Assistir em casa, preferencialmente em família.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
  { date: "2026-06-12", title: "Sagrado Coração", description: "Sem atividades programadas.", eventType: "SEM_ATIVIDADE" },
  { date: "2026-06-13", title: "Formação garotos — Meditação", description: "Sacerdote. Meditação e confissão.", eventType: "CLUBE_REGULAR", startTime: "09:00", endTime: "12:00" },
  { date: "2026-06-13", title: "Formação IBF — Caso 3: Revisão teórica + discussão em grupo", description: "Curso Pré-Adolescência (casal). Palestra Pai: NÃO.", eventType: "FORMACAO_PAIS", startTime: "11:00", endTime: "12:00" },

  // Week 3
  { date: "2026-06-18", title: "MIND — Debate: A felicidade não se compra", description: "Espiritual: Oração. G3 – Debate sobre o filme.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
  { date: "2026-06-19", title: "Oficina Cultural — Câmbio e comércio", description: "Espiritual: Terço. G1/G2.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
  { date: "2026-06-20", title: "Formação garotos — G1/G2: Prudência na internet", description: "Oficina.", eventType: "CLUBE_REGULAR", startTime: "09:00", endTime: "12:00" },
  { date: "2026-06-20", title: "Palestra Pai — Eucaristia", description: "Formação de pais (homens). IBF: NÃO.", eventType: "FORMACAO_PAIS", startTime: "11:00", endTime: "12:00" },

  // Week 4
  { date: "2026-06-24", title: "Visita aos Pobres", description: "Atividade social (quarta-feira).", eventType: "ATIVIDADE_EXTERNA", startTime: "14:00", endTime: "17:00" },
  { date: "2026-06-25", title: "MIND — Estudo individual", description: "Espiritual: Terço. G3 – Estudo livre.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
  { date: "2026-06-26", title: "Oficina Cultural — Bitcoin", description: "Espiritual: Terço. G1/G2.", eventType: "CLUBE_REGULAR", startTime: "19:30", endTime: "21:30" },
  { date: "2026-06-27", title: "Formação garotos — G1: 55-70 / G2: 105-130", description: "Sacerdote. Meditação e confissão.", eventType: "CLUBE_REGULAR", startTime: "09:00", endTime: "12:00" },
  { date: "2026-06-27", title: "Formação IBF — Caso 3: Plenária", description: "Curso Pré-Adolescência (casal). Palestra Pai: NÃO.", eventType: "FORMACAO_PAIS", startTime: "11:00", endTime: "12:00" },
];

const allEvents: EventInput[] = [
  ...marchEvents,
  ...aprilEvents,
  ...mayEvents,
  ...juneEvents,
];

async function main() {
  console.log("Seeding calendar events for 1º Semestre 2026...\n");

  // Find the first active club
  const club = await prisma.club.findFirst({ where: { isActive: true } });
  if (!club) {
    console.error("No active club found. Run the main seed first.");
    process.exit(1);
  }
  console.log(`Club: ${club.name} (${club.id})`);

  // Find a DIRETOR user to use as creator
  const director = await prisma.user.findFirst({
    where: { clubId: club.id, role: "DIRETOR", isActive: true },
  });
  if (!director) {
    console.error("No active DIRETOR found. Run the main seed first.");
    process.exit(1);
  }
  console.log(`Creator: ${director.name} (${director.id})\n`);

  // Delete existing calendar events for this semester to avoid duplicates
  const deleted = await prisma.calendarEvent.deleteMany({
    where: { clubId: club.id, semester: SEMESTER },
  });
  console.log(`Deleted ${deleted.count} existing events for semester ${SEMESTER}.\n`);

  // Insert all events
  let created = 0;
  for (const event of allEvents) {
    await prisma.calendarEvent.create({
      data: {
        clubId: club.id,
        semester: SEMESTER,
        title: event.title,
        description: event.description ?? null,
        date: new Date(event.date + "T12:00:00Z"),
        startTime: event.startTime ?? null,
        endTime: event.endTime ?? null,
        eventType: event.eventType,
        createdBy: director.id,
      },
    });
    created++;
  }

  console.log(`Successfully created ${created} calendar events.\n`);

  // Summary by type
  const summary: Record<string, number> = {};
  for (const event of allEvents) {
    summary[event.eventType] = (summary[event.eventType] ?? 0) + 1;
  }
  console.log("Summary by type:");
  for (const [type, count] of Object.entries(summary)) {
    console.log(`  ${type}: ${count}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
