"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";
import { activeInPeriodWhere } from "@/lib/membership";
import {
  buildPresencaSections,
  type PresencaMember,
  type PresencaModule,
} from "@/modules/reports/lib/presenca-sections";
import {
  buildAtendimentosEstatisticoSections,
  type EstatMember,
  type AppointmentTypeKey,
} from "@/modules/reports/lib/atendimentos-estatistico-sections";
import {
  MODULE_LABELS,
  GROUP_LABELS,
  MEMBER_STATUS_LABELS,
  APPOINTMENT_TYPE_LABELS,
  ACTIVITY_STATUS_LABELS,
  excludeFromPolaresFilter,
} from "@/lib/constants";
import type { ModuleType, GroupType, MemberStatus, AppointmentType, ActivityStatus } from "@/types";

// ==========================================
// Shared Types
// ==========================================

export interface ReportRow {
  [key: string]: string | number;
}

export interface ReportSection {
  subtitle?: string;
  columns: { key: string; header: string }[];
  rows: ReportRow[];
}

export interface ReportData {
  title: string;
  period: string;
  clubName: string;
  columns: { key: string; header: string }[];
  rows: ReportRow[];
  /** Optional multi-table layout: when set, exporters and the preview render
   *  these sections (each as its own table) instead of top-level columns/rows. */
  sections?: ReportSection[];
  generatedAt: string;
}

/**
 * Context for generating reports outside of a user session (e.g. cron jobs).
 * When provided, the report uses these values instead of getRequiredSession().
 */
export interface ReportContext {
  clubId: string;
  clubName: string;
  role?: string;
  userId?: string;
}

/** The report period selection: an inclusive day range plus an explicit year. */
export interface ReportPeriod {
  /** Inclusive day range ("YYYY-MM-DD") for range-based reports. */
  start: string;
  end: string;
  /** Year chosen on the screen — used by the annual / month-matrix reports. */
  year: number;
}

/** Parse a ReportPeriod into start/end Date objects plus a "dd/mm/aaaa a dd/mm/aaaa" label. */
function parseRange(range: ReportPeriod): {
  startDate: Date;
  endDate: Date;
  label: string;
} {
  const startDate = new Date(`${range.start}T00:00:00`);
  const endDate = new Date(`${range.end}T23:59:59.999`);
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR");
  return { startDate, endDate, label: `${fmt(startDate)} a ${fmt(endDate)}` };
}

// ==========================================
// 1. Presenca
// ==========================================

export async function getPresencaReport(
  range: ReportPeriod,
  ctx?: ReportContext
): Promise<ReportData> {
  const session = ctx ?? (await getRequiredSession());
  const { startDate, endDate, label } = parseRange(range);

  // Two reports in one file: (A) frequency over the selected range, and (B) a
  // month-by-month matrix for the explicitly chosen year — both split into one
  // table per module. Query the whole year so the matrix has every month; (A)
  // narrows to the selected range in memory.
  const year = range.year;
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
  const now = new Date();
  const currentMonth = year === now.getFullYear() ? now.getMonth() : -1;

  const memberWhere: Record<string, unknown> = {
    clubId: session.clubId,
    ...activeInPeriodWhere(yearStart, yearEnd),
  };
  if (ctx?.role === "PRECEPTOR" && ctx.userId) {
    memberWhere.preceptorId = ctx.userId;
  }

  const members = await prisma.member.findMany({
    where: memberWhere,
    select: {
      fullName: true,
      enrollmentDate: true,
      inactivatedAt: true,
      modules: { select: { moduleType: true } },
      attendanceRecords: {
        where: { session: { date: { gte: yearStart, lte: yearEnd } } },
        select: {
          present: true,
          session: { select: { date: true, dayType: true } },
        },
      },
    },
    orderBy: { fullName: "asc" },
  });

  const presencaMembers: PresencaMember[] = members.map((m) => ({
    fullName: m.fullName,
    enrollmentDate: m.enrollmentDate,
    inactivatedAt: m.inactivatedAt,
    modules: m.modules.map((x) => x.moduleType as PresencaModule),
    records: m.attendanceRecords.map((r) => ({
      present: r.present,
      date: r.session.date,
      dayType: r.session.dayType as PresencaModule,
    })),
  }));

  const sections = buildPresencaSections(presencaMembers, {
    startDate,
    endDate,
    year,
    currentMonth,
  });

  return {
    title: "Relatório de Presença",
    period: label,
    clubName: session.clubName,
    columns: [],
    rows: [],
    sections,
    generatedAt: new Date().toLocaleString("pt-BR"),
  };
}

// ==========================================
// 2. Polares
// ==========================================

export async function getPolaresReport(range: ReportPeriod): Promise<ReportData> {
  const session = await getRequiredSession();
  const { startDate, endDate, label } = parseRange(range);

  const members = await prisma.member.findMany({
    where: { clubId: session.clubId, ...activeInPeriodWhere(startDate, endDate), ...excludeFromPolaresFilter() },
    select: {
      fullName: true,
      groupType: true,
      polarEntries: {
        where: {
          date: { gte: startDate, lte: endDate },
        },
        select: { category: true, points: true },
      },
    },
    orderBy: { fullName: "asc" },
  });

  const rows: ReportRow[] = members.map((m) => {
    const byCategory: Record<string, number> = {};
    let total = 0;
    for (const entry of m.polarEntries) {
      byCategory[entry.category] = (byCategory[entry.category] ?? 0) + entry.points;
      total += entry.points;
    }

    return {
      Nome: m.fullName,
      Grupo: GROUP_LABELS[m.groupType as GroupType] ?? m.groupType,
      Presença: byCategory["PRESENCA"] ?? 0,
      Pontualidade: byCategory["PONTUALIDADE"] ?? 0,
      Amigo: byCategory["AMIGO"] ?? 0,
      Esporte: byCategory["ESPORTE"] ?? 0,
      Encargo: byCategory["ENCARGO"] ?? 0,
      Multa: byCategory["MULTA"] ?? 0,
      "Exercício": byCategory["EXERCICIO"] ?? 0,
      Boletim: byCategory["BOLETIM"] ?? 0,
      Resumo: byCategory["RESUMO"] ?? 0,
      "Outros pontos": byCategory["OUTROS_PONTOS"] ?? 0,
      Livro: byCategory["LIVRO"] ?? 0,
      Total: total,
    };
  });

  // Sort by total descending
  rows.sort((a, b) => (b.Total as number) - (a.Total as number));

  return {
    title: "Relatório de Polares",
    period: label,
    clubName: session.clubName,
    columns: [
      { key: "Nome", header: "Nome" },
      { key: "Grupo", header: "Grupo" },
      { key: "Presença", header: "Presença" },
      { key: "Pontualidade", header: "Pontualidade" },
      { key: "Amigo", header: "Amigo" },
      { key: "Esporte", header: "Esporte" },
      { key: "Encargo", header: "Encargo" },
      { key: "Multa", header: "Multa" },
      { key: "Exercício", header: "Exercício" },
      { key: "Boletim", header: "Boletim" },
      { key: "Resumo", header: "Resumo" },
      { key: "Outros pontos", header: "Outros pontos" },
      { key: "Livro", header: "Livro" },
      { key: "Total", header: "Total" },
    ],
    rows,
    generatedAt: new Date().toLocaleString("pt-BR"),
  };
}

// ==========================================
// 4. Atendimentos
// ==========================================

/** Optional generation-time filters for the detailed atendimentos report. */
export interface AtendimentosReportFilters {
  /** Restrict to a single sócio (member id — still club-scoped server-side). */
  memberId?: string;
  /** Restrict to a single appointment type. */
  type?: AppointmentType;
}

export async function getAtendimentosReport(
  range: ReportPeriod,
  ctx?: ReportContext,
  filters?: AtendimentosReportFilters
): Promise<ReportData> {
  const session = ctx ?? (await getRequiredSession());
  const { startDate, endDate, label } = parseRange(range);

  const role = ctx?.role ?? (session as { role?: string }).role;
  const userId = ctx?.userId ?? (session as { userId?: string }).userId;

  // Role-based filtering (mirrors get-appointments.ts logic)
  type AppointmentResult = {
    date: Date;
    type: string;
    notes: string | null;
    purposes: string | null;
    lifePlan: string | null;
    member: { fullName: string };
    conductor: { name: string };
  };

  const selectFields = {
    date: true,
    type: true,
    notes: true,
    purposes: true,
    lifePlan: true,
    member: { select: { fullName: true } },
    conductor: { select: { name: true } },
  } as const;

  // Base member filter is ALWAYS club-scoped; an optional memberId narrows it
  // to a single sócio without ever bypassing tenant isolation.
  const memberWhere = {
    clubId: session.clubId,
    ...(filters?.memberId ? { id: filters.memberId } : {}),
  };
  const dateWhere = { gte: startDate, lte: endDate };
  const typeFilter = filters?.type;

  let allAppointments: AppointmentResult[];

  if (role === "MONITOR") {
    // MONITORs see SACERDOTE only — a non-sacerdote type filter yields nothing.
    if (typeFilter && typeFilter !== "SACERDOTE") {
      allAppointments = [];
    } else {
      allAppointments = await prisma.appointment.findMany({
        where: { member: memberWhere, date: dateWhere, type: "SACERDOTE" },
        select: selectFields,
        orderBy: { date: "desc" },
      });
    }
  } else if (role === "PRECEPTOR" && userId) {
    // PRECEPTORs: all SACERDOTE + PRECEPTORIA only for assigned members.
    // The type filter is intersected with these constraints, not layered over them.
    const queries: Promise<AppointmentResult[]>[] = [];
    if (!typeFilter || typeFilter === "SACERDOTE") {
      queries.push(
        prisma.appointment.findMany({
          where: { member: memberWhere, date: dateWhere, type: "SACERDOTE" },
          select: selectFields,
          orderBy: { date: "desc" },
        })
      );
    }
    if (!typeFilter || typeFilter !== "SACERDOTE") {
      queries.push(
        prisma.appointment.findMany({
          where: {
            member: { ...memberWhere, preceptorId: userId },
            date: dateWhere,
            type: typeFilter
              ? typeFilter
              : { in: ["PRECEPTORIA_SOCIO", "PRECEPTORIA_PAIS"] },
          },
          select: selectFields,
          orderBy: { date: "desc" },
        })
      );
    }
    const results = await Promise.all(queries);
    allAppointments = results
      .flat()
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  } else {
    // DIRETOR / SUPER_ADMIN: see everything (optionally narrowed by type).
    allAppointments = await prisma.appointment.findMany({
      where: {
        member: memberWhere,
        date: dateWhere,
        ...(typeFilter ? { type: typeFilter } : {}),
      },
      select: selectFields,
      orderBy: { date: "desc" },
    });
  }

  const rows: ReportRow[] = allAppointments.map((a) => ({
    Data: a.date.toLocaleDateString("pt-BR"),
    Sócio: a.member.fullName,
    Tipo: APPOINTMENT_TYPE_LABELS[a.type as AppointmentType] ?? a.type,
    "Realizado por": a.type === "SACERDOTE" ? "Sacerdote" : a.conductor.name,
    Observações: a.notes ?? "",
    Propósitos: a.purposes ?? "",
    "Plano de Vida": a.lifePlan ?? "",
  }));

  // Drop the columns made redundant by an active filter (Grupo is always absent).
  const columns = [
    { key: "Data", header: "Data" },
    ...(filters?.memberId ? [] : [{ key: "Sócio", header: "Sócio" }]),
    ...(filters?.type ? [] : [{ key: "Tipo", header: "Tipo" }]),
    { key: "Realizado por", header: "Realizado por" },
    { key: "Observações", header: "Observações" },
    { key: "Propósitos", header: "Propósitos" },
    { key: "Plano de Vida", header: "Plano de Vida" },
  ];

  // Because a filtered report drops the Sócio/Tipo columns, surface the active
  // filters in the period line so the reader still knows the scope.
  let memberName: string | undefined;
  if (filters?.memberId) {
    const m = await prisma.member.findFirst({
      where: { id: filters.memberId, clubId: session.clubId },
      select: { fullName: true },
    });
    memberName = m?.fullName;
  }
  const filterBits: string[] = [];
  if (memberName) filterBits.push(`Sócio: ${memberName}`);
  if (typeFilter) filterBits.push(`Tipo: ${APPOINTMENT_TYPE_LABELS[typeFilter]}`);
  const period = filterBits.length ? `${label} — ${filterBits.join(" · ")}` : label;

  return {
    title: "Relatório de Atendimentos",
    period,
    clubName: session.clubName,
    columns,
    rows,
    generatedAt: new Date().toLocaleString("pt-BR"),
  };
}

// ==========================================
// 4b. Atendimentos (Estatístico) — matrix by type, all monitors+ see everything
// ==========================================

export async function getAtendimentosEstatistico(
  range: ReportPeriod,
  ctx?: ReportContext
): Promise<ReportData> {
  const session = ctx ?? (await getRequiredSession());
  const year = range.year;
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
  const now = new Date();
  const currentMonth = year === now.getFullYear() ? now.getMonth() : -1;

  // Pure statistics — no per-role row filtering (unlike getAtendimentosReport).
  const members = await prisma.member.findMany({
    where: {
      clubId: session.clubId,
      ...activeInPeriodWhere(yearStart, yearEnd),
    },
    select: {
      fullName: true,
      enrollmentDate: true,
      inactivatedAt: true,
      appointments: {
        where: { date: { gte: yearStart, lte: yearEnd } },
        select: { type: true, date: true },
      },
    },
    orderBy: { fullName: "asc" },
  });

  const estatMembers: EstatMember[] = members.map((m) => ({
    fullName: m.fullName,
    enrollmentDate: m.enrollmentDate,
    inactivatedAt: m.inactivatedAt,
    appointments: m.appointments.map((a) => ({
      type: a.type as AppointmentTypeKey,
      date: a.date,
    })),
  }));

  const sections = buildAtendimentosEstatisticoSections(estatMembers, {
    year,
    currentMonth,
  });

  return {
    title: "Relatório Estatístico de Atendimentos",
    period: `Ano ${year}`,
    clubName: session.clubName,
    columns: [],
    rows: [],
    sections,
    generatedAt: new Date().toLocaleString("pt-BR"),
  };
}

// ==========================================
// 5. Livros
// ==========================================

export async function getLivrosReport(range: ReportPeriod): Promise<ReportData> {
  const session = await getRequiredSession();
  const { startDate, endDate, label } = parseRange(range);

  const books = await prisma.book.findMany({
    where: { clubId: session.clubId },
    select: {
      title: true,
      author: true,
      status: true,
      loans: {
        where: {
          checkoutDate: { gte: startDate, lte: endDate },
        },
        select: {
          checkoutDate: true,
          returnDate: true,
          member: { select: { fullName: true } },
        },
        orderBy: { checkoutDate: "desc" },
      },
    },
    orderBy: { title: "asc" },
  });

  const rows: ReportRow[] = [];

  for (const book of books) {
    if (book.loans.length === 0) {
      rows.push({
        Título: book.title,
        Autor: book.author ?? "",
        Status: book.status === "EMPRESTADO" ? "Emprestado" : "Disponível",
        "Empréstimos no Período": 0,
        "Último Leitor": "-",
      });
    } else {
      rows.push({
        Título: book.title,
        Autor: book.author ?? "",
        Status: book.status === "EMPRESTADO" ? "Emprestado" : "Disponível",
        "Empréstimos no Período": book.loans.length,
        "Último Leitor": book.loans[0].member.fullName,
      });
    }
  }

  return {
    title: "Relatório de Biblioteca",
    period: label,
    clubName: session.clubName,
    columns: [
      { key: "Título", header: "Título" },
      { key: "Autor", header: "Autor" },
      { key: "Status", header: "Status" },
      { key: "Empréstimos no Período", header: "Empréstimos" },
      { key: "Último Leitor", header: "Último Leitor" },
    ],
    rows,
    generatedAt: new Date().toLocaleString("pt-BR"),
  };
}

// ==========================================
// 6. Histórico de Leitura
// ==========================================

export async function getHistoricoLeituraReport(
  _range: ReportPeriod
): Promise<ReportData> {
  const session = await getRequiredSession();

  const members = await prisma.member.findMany({
    where: { clubId: session.clubId, status: "ATIVO" },
    select: {
      fullName: true,
      bookLoans: {
        select: {
          checkoutDate: true,
          returnDate: true,
          book: { select: { title: true, author: true } },
        },
        orderBy: { checkoutDate: "desc" },
      },
    },
    orderBy: { fullName: "asc" },
  });

  const rows: ReportRow[] = [];

  for (const member of members) {
    if (member.bookLoans.length === 0) {
      rows.push({
        Sócio: member.fullName,
        Livro: "-",
        Autor: "-",
        Devolução: "-",
      });
    } else {
      member.bookLoans.forEach((loan, i) => {
        rows.push({
          Sócio: i === 0 ? member.fullName : "",
          Livro: loan.book.title,
          Autor: loan.book.author ?? "-",
          Devolução: loan.returnDate
            ? loan.returnDate.toLocaleDateString("pt-BR")
            : "Emprestado",
        });
      });
    }
  }

  return {
    title: "Histórico de Leitura",
    period: "Geral",
    clubName: session.clubName,
    columns: [
      { key: "Sócio", header: "Sócio" },
      { key: "Livro", header: "Livro" },
      { key: "Autor", header: "Autor" },
      { key: "Devolução", header: "Devolução" },
    ],
    rows,
    generatedAt: new Date().toLocaleString("pt-BR"),
  };
}

// ==========================================
// 7. Formacao de Pais
// ==========================================

export async function getFormacaoPaisReport(
  range: ReportPeriod,
  ctx?: ReportContext
): Promise<ReportData> {
  const session = ctx ?? (await getRequiredSession());
  const { startDate, endDate, label } = parseRange(range);

  // Get all formations for this club in the month
  const formations = await prisma.parentFormation.findMany({
    where: {
      clubId: session.clubId,
      date: { gte: startDate, lte: endDate },
    },
    select: {
      id: true,
      type: true,
      attendance: {
        select: { parentId: true, present: true },
      },
    },
  });

  // Get all parents linked to this club's members
  // When called for a PRECEPTOR, filter to only parents of their assigned members
  type ParentWhere = Record<string, unknown>;
  const parentWhere: ParentWhere = {
    memberParents: {
      some: {
        member: {
          clubId: session.clubId,
          ...(ctx?.role === "PRECEPTOR" && ctx.userId
            ? { preceptorId: ctx.userId }
            : {}),
        },
      },
    },
  };

  const parents = await prisma.parent.findMany({
    where: parentWhere,
    select: {
      id: true,
      fullName: true,
      relationship: true,
      sex: true,
    },
    orderBy: { fullName: "asc" },
  });

  // Build a set of parentIds who were present in each formation type
  const presentFormacaoPai = new Set<string>();
  const presentFormacaoCasal = new Set<string>();

  for (const f of formations) {
    for (const a of f.attendance) {
      if (!a.present) continue;
      if (f.type === "FORMACAO_PAI") {
        presentFormacaoPai.add(a.parentId);
      } else if (f.type === "FORMACAO_CASAL") {
        presentFormacaoCasal.add(a.parentId);
      }
    }
  }

  // Determine if a parent should attend Formacao Pai:
  // PAI -> yes, MAE -> no, RESPONSAVEL -> depends on sex field
  const shouldAttendFormacaoPai = (p: { relationship: string; sex: string | null }) => {
    if (p.relationship === "PAI") return true;
    if (p.relationship === "MAE") return false;
    // RESPONSAVEL: check sex field
    return p.sex === "MASCULINO";
  };

  const rows: ReportRow[] = parents.map((p) => ({
    Nome: p.fullName,
    "Formação Pai": shouldAttendFormacaoPai(p)
      ? presentFormacaoPai.has(p.id) ? "Sim" : "Não"
      : "—",
    "Formação Casal": presentFormacaoCasal.has(p.id) ? "Sim" : "Não",
  }));

  return {
    title: "Relatório de Formação de Pais",
    period: label,
    clubName: session.clubName,
    columns: [
      { key: "Nome", header: "Nome" },
      { key: "Formação Pai", header: "Formação Pai" },
      { key: "Formação Casal", header: "Formação Casal" },
    ],
    rows,
    generatedAt: new Date().toLocaleString("pt-BR"),
  };
}

// ==========================================
// 7. Atividades
// ==========================================

export async function getAtividadesReport(range: ReportPeriod): Promise<ReportData> {
  const session = await getRequiredSession();
  const { startDate, endDate, label } = parseRange(range);

  const activities = await prisma.activity.findMany({
    where: {
      clubId: session.clubId,
      startDate: { gte: startDate, lte: endDate },
    },
    select: {
      name: true,
      startDate: true,
      endDate: true,
      status: true,
      costPerPerson: true,
      registrations: {
        select: { id: true },
      },
    },
    orderBy: { startDate: "desc" },
  });

  const rows: ReportRow[] = activities.map((a) => ({
    Atividade: a.name,
    "Data Início": a.startDate?.toLocaleDateString("pt-BR") ?? "-",
    "Data Fim": a.endDate?.toLocaleDateString("pt-BR") ?? "-",
    Status: ACTIVITY_STATUS_LABELS[a.status as ActivityStatus] ?? a.status,
    Inscritos: a.registrations.length,
    "Custo/Pessoa (R$)": parseFloat(Number(a.costPerPerson ?? 0).toFixed(2)),
  }));

  return {
    title: "Relatório de Atividades",
    period: label,
    clubName: session.clubName,
    columns: [
      { key: "Atividade", header: "Atividade" },
      { key: "Data Início", header: "Data Início" },
      { key: "Data Fim", header: "Data Fim" },
      { key: "Status", header: "Status" },
      { key: "Inscritos", header: "Inscritos" },
      { key: "Custo/Pessoa (R$)", header: "Custo/Pessoa (R$)" },
    ],
    rows,
    generatedAt: new Date().toLocaleString("pt-BR"),
  };
}

// ==========================================
// 9. Inscritos (Active Members)
// ==========================================

export async function getInscritosReport(
  _range: ReportPeriod
): Promise<ReportData> {
  const session = await getRequiredSession();

  const members = await prisma.member.findMany({
    where: { clubId: session.clubId, status: "ATIVO" },
    select: {
      code: true,
      fullName: true,
      birthDate: true,
      groupType: true,
      modules: { select: { moduleType: true } },
      status: true,
      enrollmentDate: true,
      preceptor: { select: { name: true } },
      parents: {
        select: {
          parent: { select: { fullName: true, relationship: true, sex: true } },
        },
      },
    },
    orderBy: { fullName: "asc" },
  });

  const rows: ReportRow[] = members.map((m) => {
    const age = Math.floor(
      (Date.now() - m.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );

    // A male guardian (RESPONSAVEL/MASCULINO) stands in as "Pai", a female one
    // as "Mãe", but only when there's no actual PAI/MAE to show.
    const pai =
      m.parents.find((p) => p.parent.relationship === "PAI") ??
      m.parents.find(
        (p) =>
          p.parent.relationship === "RESPONSAVEL" &&
          p.parent.sex === "MASCULINO"
      );
    const mae =
      m.parents.find((p) => p.parent.relationship === "MAE") ??
      m.parents.find(
        (p) =>
          p.parent.relationship === "RESPONSAVEL" &&
          p.parent.sex === "FEMININO"
      );

    const modulesLabel = m.modules.map((mod) => MODULE_LABELS[mod.moduleType as ModuleType] ?? mod.moduleType).join(", ");

    return {
      Código: m.code,
      Nome: m.fullName,
      Idade: age,
      "Data Nasc.": m.birthDate.toLocaleDateString("pt-BR"),
      Grupo: GROUP_LABELS[m.groupType as GroupType] ?? m.groupType,
      Módulo: modulesLabel,
      Status: MEMBER_STATUS_LABELS[m.status as MemberStatus] ?? m.status,
      Preceptor: m.preceptor?.name ?? "—",
      Pai: pai?.parent.fullName ?? "—",
      Mãe: mae?.parent.fullName ?? "—",
      Inscrição: m.enrollmentDate
        ? m.enrollmentDate.toLocaleDateString("pt-BR")
        : "—",
    };
  });

  return {
    title: "Relatório de Inscritos",
    period: "Sócios Ativos",
    clubName: session.clubName,
    columns: [
      { key: "Código", header: "Cód." },
      { key: "Nome", header: "Nome" },
      { key: "Idade", header: "Idade" },
      { key: "Data Nasc.", header: "Data Nasc." },
      { key: "Grupo", header: "Grupo" },
      { key: "Módulo", header: "Módulo" },
      { key: "Status", header: "Status" },
      { key: "Preceptor", header: "Preceptor" },
      { key: "Pai", header: "Pai" },
      { key: "Mãe", header: "Mãe" },
      { key: "Inscrição", header: "Inscrição" },
    ],
    rows,
    generatedAt: new Date().toLocaleString("pt-BR"),
  };
}
