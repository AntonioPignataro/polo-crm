import type {
  ReportSection,
  ReportRow,
} from "@/modules/reports/queries/get-report-details";

export type PresencaModule = "QUINTA" | "SEXTA" | "SABADO";

export interface PresencaMember {
  fullName: string;
  enrollmentDate: Date | null;
  inactivatedAt: Date | null;
  modules: PresencaModule[];
  records: { present: boolean; date: Date; dayType: PresencaModule }[];
}

const MODULE_LABEL: Record<PresencaModule, string> = {
  QUINTA: "Quinta",
  SEXTA: "Sexta",
  SABADO: "Sábado",
};
const MODULES: PresencaModule[] = ["QUINTA", "SEXTA", "SABADO"];
const MONTHS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

// Mirror of src/lib/membership.ts, inlined so this stays a pure, dependency-free
// (and unit-testable) module. Kept trivially in sync with that file.
function isActiveInPeriod(m: PresencaMember, start: Date, end: Date): boolean {
  if (m.enrollmentDate && m.enrollmentDate > end) return false;
  if (m.inactivatedAt && m.inactivatedAt < start) return false;
  return true;
}
function wasActiveInMonth(m: PresencaMember, year: number, month: number): boolean {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  if (m.enrollmentDate && m.enrollmentDate > last) return false;
  if (m.inactivatedAt && m.inactivatedAt < first) return false;
  return true;
}

/**
 * Build the presença report as two stacked reports (six tables total):
 *  (A) Frequência — one table per module over [startDate, endDate];
 *  (B) Matriz Mensal — one table per module, member × Jan..Dez for the year
 *      ("n/a" = not a member that month, "(...)" = current in-progress month,
 *       Total = sum of completed months only).
 */
export function buildPresencaSections(
  members: PresencaMember[],
  opts: { startDate: Date; endDate: Date; year: number; currentMonth: number }
): ReportSection[] {
  const sections: ReportSection[] = [];

  // ---- (A) Frequency by module over the selected range ----
  const freqColumns = [
    { key: "Nome", header: "Nome" },
    { key: "Sessões", header: "Sessões" },
    { key: "Presenças", header: "Presenças" },
    { key: "Frequência (%)", header: "Frequência (%)" },
  ];
  for (const mod of MODULES) {
    const rows: ReportRow[] = members
      .filter(
        (m) =>
          m.modules.includes(mod) &&
          isActiveInPeriod(m, opts.startDate, opts.endDate)
      )
      .map((m) => {
        const recs = m.records.filter(
          (r) =>
            r.dayType === mod &&
            r.date >= opts.startDate &&
            r.date <= opts.endDate
        );
        const total = recs.length;
        const presentes = recs.filter((r) => r.present).length;
        return {
          Nome: m.fullName,
          Sessões: total,
          Presenças: presentes,
          "Frequência (%)": total > 0 ? Math.round((presentes / total) * 100) : 0,
        };
      });
    sections.push({
      subtitle: `Frequência — ${MODULE_LABEL[mod]}`,
      columns: freqColumns,
      rows,
    });
  }

  // ---- (B) Monthly matrix by module over the whole year ----
  const matrixColumns = [
    { key: "Nome", header: "Nome" },
    ...MONTHS.map((mn) => ({ key: mn, header: mn })),
    { key: "Total", header: "Total" },
  ];
  for (const mod of MODULES) {
    const rows: ReportRow[] = members
      .filter((m) => m.modules.includes(mod))
      .map((m) => {
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
          const count = m.records.filter(
            (r) =>
              r.present &&
              r.dayType === mod &&
              r.date.getUTCFullYear() === opts.year &&
              r.date.getUTCMonth() === mo
          ).length;
          row[MONTHS[mo]] = count;
          total += count;
        }
        row.Total = total;
        return row;
      });
    sections.push({
      subtitle: `Matriz Mensal — ${MODULE_LABEL[mod]}`,
      columns: matrixColumns,
      rows,
    });
  }

  return sections;
}
