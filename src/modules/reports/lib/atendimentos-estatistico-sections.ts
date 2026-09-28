import type {
  ReportSection,
  ReportRow,
} from "@/modules/reports/queries/get-report-details";

export type AppointmentTypeKey =
  | "SACERDOTE"
  | "PRECEPTORIA_SOCIO"
  | "PRECEPTORIA_PAIS";

export interface EstatMember {
  fullName: string;
  enrollmentDate: Date | null;
  inactivatedAt: Date | null;
  appointments: { type: AppointmentTypeKey; date: Date }[];
}

const TYPE_LABEL: Record<AppointmentTypeKey, string> = {
  PRECEPTORIA_PAIS: "Preceptoria Pais",
  PRECEPTORIA_SOCIO: "Sócios",
  SACERDOTE: "Sacerdotes",
};
const TYPE_ORDER: AppointmentTypeKey[] = [
  "PRECEPTORIA_PAIS",
  "PRECEPTORIA_SOCIO",
  "SACERDOTE",
];
const MONTHS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

// Mirror of src/lib/membership.ts wasActiveInMonth, inlined so this stays a
// pure, dependency-free (unit-testable) module.
function wasActiveInMonth(m: EstatMember, year: number, month: number): boolean {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  if (m.enrollmentDate && m.enrollmentDate > last) return false;
  if (m.inactivatedAt && m.inactivatedAt < first) return false;
  return true;
}

/**
 * Statistical atendimentos report: one table per appointment type (Preceptoria
 * Pais / Sócios / Sacerdotes), member × Jan..Dez for the year. Cell = count of
 * that type for the member that month; "n/a" when not a member that month,
 * "(...)" for the current in-progress month, Total = completed months only.
 * Pure statistics (no content) — visible to all monitors+.
 */
export function buildAtendimentosEstatisticoSections(
  members: EstatMember[],
  opts: { year: number; currentMonth: number }
): ReportSection[] {
  const columns = [
    { key: "Nome", header: "Nome" },
    ...MONTHS.map((mn) => ({ key: mn, header: mn })),
    { key: "Total", header: "Total" },
  ];

  return TYPE_ORDER.map((type) => {
    const rows: ReportRow[] = members.map((m) => {
      const row: ReportRow = { Nome: m.fullName };
      let total = 0;
      for (let mo = 0; mo < 12; mo++) {
        if (!wasActiveInMonth(m, opts.year, mo)) {
          row[MONTHS[mo]] = "n/a";
          continue;
        }
        if (mo === opts.currentMonth) {
          row[MONTHS[mo]] = "(...)";
          continue;
        }
        const count = m.appointments.filter(
          (a) =>
            a.type === type &&
            a.date.getUTCFullYear() === opts.year &&
            a.date.getUTCMonth() === mo
        ).length;
        row[MONTHS[mo]] = count;
        total += count;
      }
      row.Total = total;
      return row;
    });
    return { subtitle: TYPE_LABEL[type], columns, rows };
  });
}
