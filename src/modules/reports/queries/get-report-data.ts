"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";

export interface ReportSummary {
  presenca: { total: number; rate: number };
  polares: { totalEntries: number; totalPoints: number };
  atendimentos: { total: number };
  livros: { totalBooks: number; emprestados: number };
  formacaoPais: { total: number };
  atividades: { total: number };
  historicoLeitura: { totalLoans: number; activeLoans: number };
  inscritos: { total: number };
}

export async function getReportSummary(): Promise<ReportSummary> {
  const session = await getRequiredSession();
  const clubId = session.clubId;

  const [
    attendanceRecords,
    polarEntries,
    appointments,
    books,
    formations,
    activities,
    totalLoans,
    activeLoans,
    activeMembers,
  ] = await Promise.all([
    prisma.attendanceRecord.count({
      where: { session: { clubId } },
    }),
    prisma.polarEntry.aggregate({
      where: { member: { clubId } },
      _count: true,
      _sum: { points: true },
    }),
    prisma.appointment.count({
      where: { member: { clubId } },
    }),
    prisma.book.groupBy({
      by: ["status"],
      where: { clubId },
      _count: true,
    }),
    prisma.parentFormation.count({
      where: { clubId },
    }),
    prisma.activity.count({
      where: { clubId },
    }),
    prisma.bookLoan.count({
      where: { book: { clubId } },
    }),
    prisma.bookLoan.count({
      where: { book: { clubId }, returnDate: null },
    }),
    prisma.member.count({
      where: { clubId, status: "ATIVO" },
    }),
  ]);

  const presentRecords = await prisma.attendanceRecord.count({
    where: { session: { clubId }, present: true },
  });

  const totalBooks = books.reduce((acc, b) => acc + b._count, 0);
  const emprestados =
    books.find((b) => b.status === "EMPRESTADO")?._count ?? 0;

  return {
    presenca: {
      total: attendanceRecords,
      rate: attendanceRecords > 0 ? (presentRecords / attendanceRecords) * 100 : 0,
    },
    polares: {
      totalEntries: polarEntries._count,
      totalPoints: polarEntries._sum.points ?? 0,
    },
    atendimentos: { total: appointments },
    livros: { totalBooks, emprestados },
    formacaoPais: { total: formations },
    atividades: { total: activities },
    historicoLeitura: { totalLoans, activeLoans },
    inscritos: { total: activeMembers },
  };
}
