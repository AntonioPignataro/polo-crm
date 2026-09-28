"use client";

import { useState, useTransition } from "react";
import {
  BarChart3,
  ClipboardCheck,
  Star,
  MessageSquare,
  BookOpen,
  BookMarked,
  GraduationCap,
  Mountain,
  Users,
  FileDown,
  FileSpreadsheet,
  CalendarDays,
  Loader2,
  CheckCircle2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ReportSummary } from "@/modules/reports/queries/get-report-data";
import type { ReportData, ReportPeriod } from "@/modules/reports/queries/get-report-details";
import {
  getPresencaReport,
  getPolaresReport,
  getAtendimentosReport,
  getAtendimentosEstatistico,
  getLivrosReport,
  getFormacaoPaisReport,
  getAtividadesReport,
  getHistoricoLeituraReport,
  getInscritosReport,
} from "@/modules/reports/queries/get-report-details";
import type { MemberOption } from "@/modules/appointments/queries/get-members-for-appointment";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/constants";
import type { AppointmentType } from "@/types";

// ==========================================
// Helpers
// ==========================================

/** Format the selected range as a "dd/mm/aaaa a dd/mm/aaaa" label. */
function formatRangeLabel(start: string, end: string): string {
  const fmt = (s: string) =>
    s ? new Date(`${s}T00:00:00`).toLocaleDateString("pt-BR") : "—";
  return `${fmt(start)} a ${fmt(end)}`;
}

// ==========================================
// Report types
// ==========================================

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  stat: string;
}

type ReportFetcher = (range: ReportPeriod) => Promise<ReportData>;

const reportFetchers: Record<string, ReportFetcher> = {
  presenca: getPresencaReport,
  polares: getPolaresReport,
  atendimentos: getAtendimentosReport,
  "atendimentos-estatistico": getAtendimentosEstatistico,
  livros: getLivrosReport,
  "historico-leitura": getHistoricoLeituraReport,
  "formacao-pais": getFormacaoPaisReport,
  atividades: getAtividadesReport,
  inscritos: getInscritosReport,
};

// ==========================================
// Component
// ==========================================

interface RelatoriosViewProps {
  summary: ReportSummary;
  members: MemberOption[];
}

export function RelatoriosView({ summary, members }: RelatoriosViewProps) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const yearOptions = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i
  );
  const [, startTransition] = useTransition();
  const [loadingReport, setLoadingReport] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<ReportData | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  // Generation-time filters for the detailed atendimentos report ("" = all).
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [selectedType, setSelectedType] = useState<AppointmentType | "">("");

  /**
   * Resolve a report's data. Most reports use the shared fetcher map; the
   * atendimentos report is special-cased so its garoto/tipo filters reach the
   * server action (the generic ReportFetcher signature can't carry them).
   */
  function fetchReport(report: ReportType): Promise<ReportData> | null {
    const range: ReportPeriod = { start: startDate, end: endDate, year: selectedYear };
    if (report.id === "atendimentos") {
      return getAtendimentosReport(range, undefined, {
        memberId: selectedMember || undefined,
        type: selectedType || undefined,
      });
    }
    const fetcher = reportFetchers[report.id];
    if (!fetcher) return null;
    return fetcher(range);
  }

  function handleGenerate(report: ReportType) {
    const request = fetchReport(report);
    if (!request) return;

    setLoadingReport(report.id);
    startTransition(async () => {
      try {
        const data = await request;
        setPreviewData(data);
        setPreviewOpen(true);
      } catch (err) {
        console.error("Erro ao gerar relatório:", err);
      } finally {
        setLoadingReport(null);
      }
    });
  }

  function handleExportPDF(report: ReportType) {
    const request = fetchReport(report);
    if (!request) return;

    setLoadingReport(`${report.id}-pdf`);
    startTransition(async () => {
      try {
        const data = await request;
        // Dynamic import to avoid SSR issues with jsPDF
        const { exportToPDF } = await import("@/lib/export-pdf");
        exportToPDF(data);
      } catch (err) {
        console.error("Erro ao exportar PDF:", err);
      } finally {
        setLoadingReport(null);
      }
    });
  }

  function handleExportExcel(report: ReportType) {
    const request = fetchReport(report);
    if (!request) return;

    setLoadingReport(`${report.id}-excel`);
    startTransition(async () => {
      try {
        const data = await request;
        // Dynamic import to avoid SSR issues with ExcelJS
        const { exportToExcel } = await import("@/lib/export-excel");
        await exportToExcel(data);
      } catch (err) {
        console.error("Erro ao exportar Excel:", err);
      } finally {
        setLoadingReport(null);
      }
    });
  }

  async function handlePreviewExportPDF() {
    if (!previewData) return;
    const { exportToPDF } = await import("@/lib/export-pdf");
    exportToPDF(previewData);
  }

  async function handlePreviewExportExcel() {
    if (!previewData) return;
    const { exportToExcel } = await import("@/lib/export-excel");
    await exportToExcel(previewData);
  }

  const reports: ReportType[] = [
    {
      id: "inscritos",
      title: "Inscritos",
      description:
        "Lista completa dos sócios ativos com dados pessoais, grupo, módulo e preceptor.",
      icon: <Users className="size-8 text-indigo-600" />,
      stat: `${summary.inscritos.total} sócios ativos`,
    },
    {
      id: "presenca",
      title: "Presença",
      description:
        "Relatório de frequência dos sócios com porcentagem de presença por dia e módulo.",
      icon: <ClipboardCheck className="size-8 text-green-600" />,
      stat: `${summary.presenca.total} registros (${summary.presenca.rate.toFixed(0)}% presentes)`,
    },
    {
      id: "polares",
      title: "Polares",
      description:
        "Ranking de polares acumulados por sócio, com detalhamento por categoria.",
      icon: <Star className="size-8 text-yellow-600" />,
      stat: `${summary.polares.totalEntries} lançamentos (${summary.polares.totalPoints} pol)`,
    },
    {
      id: "atendimentos",
      title: "Atendimentos",
      description:
        "Histórico de atendimentos realizados por tipo: sacerdotal, preceptoria sócio e pais.",
      icon: <MessageSquare className="size-8 text-blue-600" />,
      stat: `${summary.atendimentos.total} atendimentos`,
    },
    {
      id: "atendimentos-estatistico",
      title: "Atendimentos (Estatístico)",
      description:
        "Contagem mensal de atendimentos por tipo (preceptoria pais, sócios, sacerdotes), por sócio.",
      icon: <BarChart3 className="size-8 text-cyan-600" />,
      stat: `${summary.atendimentos.total} atendimentos`,
    },
    {
      id: "livros",
      title: "Livros",
      description:
        "Status do acervo da biblioteca com histórico de empréstimos e devolvidos.",
      icon: <BookOpen className="size-8 text-orange-600" />,
      stat: `${summary.livros.totalBooks} livros (${summary.livros.emprestados} emprestados)`,
    },
    {
      id: "historico-leitura",
      title: "Histórico de Leitura",
      description:
        "Histórico completo de leitura de cada sócio com livros emprestados e devoluções.",
      icon: <BookMarked className="size-8 text-amber-600" />,
      stat: `${summary.historicoLeitura.totalLoans} empréstimos (${summary.historicoLeitura.activeLoans} em andamento)`,
    },
    {
      id: "formacao-pais",
      title: "Formação de Pais",
      description:
        "Resumo das formações realizadas com número de participantes.",
      icon: <GraduationCap className="size-8 text-pink-600" />,
      stat: `${summary.formacaoPais.total} formações`,
    },
    {
      id: "atividades",
      title: "Atividades",
      description:
        "Resumo das atividades realizadas com número de inscritos, custos e status.",
      icon: <Mountain className="size-8 text-teal-600" />,
      stat: `${summary.atividades.total} atividades`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="hidden md:block">
        <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground mt-1">
          Gere relatórios detalhados e exporte em PDF ou Excel.
        </p>
      </div>

      {/* Manual Download */}
      <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-green-600 text-white">
              <BookOpen className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                Manual Clube Polo — 1º Semestre 2026
              </p>
              <p className="text-xs text-muted-foreground">
                Calendário, regulamento e informações do semestre em PDF.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <a
              href="/manual-clube-polo-1-semestre-2026.pdf"
              download="Manual Clube Polo - 1º Semestre 2026.pdf"
            >
              <Download className="mr-1 size-4" />
              Baixar PDF
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Period Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="size-5" />
            Selecione o Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data inicial</label>
              <DatePicker value={startDate} onChange={setStartDate} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data final</label>
              <DatePicker value={endDate} onChange={setEndDate} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ano (relatórios anuais)</label>
              <Select
                value={String(selectedYear)}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => {
          const isGenerating = loadingReport === report.id;
          const isPDFing = loadingReport === `${report.id}-pdf`;
          const isExceling = loadingReport === `${report.id}-excel`;
          const isBusy = isGenerating || isPDFing || isExceling;

          // Period-independent reports (all-time)
          const isGeneral =
            report.id === "historico-leitura" || report.id === "inscritos";
          const isYearly = report.id === "atendimentos-estatistico";
          const periodLabel = isGeneral
            ? "Geral"
            : isYearly
              ? `Ano ${selectedYear}`
              : formatRangeLabel(startDate, endDate);

          return (
            <Card key={report.id} className="flex flex-col">
              <CardHeader className="flex-1">
                <div className="mb-3">{report.icon}</div>
                <CardTitle className="text-base">{report.title}</CardTitle>
                <CardDescription className="text-xs">
                  {report.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {report.stat}
                </p>
                <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="size-3" />
                  <span>
                    Período:{" "}
                    <span>{periodLabel}</span>
                  </span>
                </div>
                {report.id === "atendimentos" && (
                  <div className="mb-3 space-y-2">
                    <Select
                      value={selectedMember || "all"}
                      onValueChange={(v) =>
                        setSelectedMember(v === "all" ? "" : v)
                      }
                    >
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue placeholder="Todos os sócios" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os sócios</SelectItem>
                        {members.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={selectedType || "all"}
                      onValueChange={(v) =>
                        setSelectedType(v === "all" ? "" : (v as AppointmentType))
                      }
                    >
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue placeholder="Todos os tipos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        {(
                          Object.keys(APPOINTMENT_TYPE_LABELS) as AppointmentType[]
                        ).map((t) => (
                          <SelectItem key={t} value={t}>
                            {APPOINTMENT_TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={isBusy}
                    onClick={() => handleGenerate(report)}
                  >
                    {isGenerating ? (
                      <Loader2 className="mr-1 size-3 animate-spin" />
                    ) : (
                      <BarChart3 className="mr-1 size-3" />
                    )}
                    {isGenerating ? "Gerando..." : "Gerar Relatório"}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    title="Exportar PDF"
                    disabled={isBusy}
                    onClick={() => handleExportPDF(report)}
                  >
                    {isPDFing ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <FileDown className="size-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    title="Exportar Excel"
                    disabled={isBusy}
                    onClick={() => handleExportExcel(report)}
                  >
                    {isExceling ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="size-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Preview Dialog */}
      <ResponsiveDialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <ResponsiveDialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col w-[95vw] sm:w-auto">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-green-600" />
              {previewData?.title}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {previewData?.period} &mdash; {previewData?.rows.length}{" "}
              registros &mdash; Gerado em {previewData?.generatedAt}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          {/* Export buttons in dialog */}
          <div className="flex flex-col gap-2 sm:flex-row pb-2">
            <Button size="sm" onClick={handlePreviewExportPDF} className="flex-1 sm:flex-none">
              <FileDown className="mr-1 size-3" />
              Exportar PDF
            </Button>
            <Button size="sm" variant="outline" onClick={handlePreviewExportExcel} className="flex-1 sm:flex-none">
              <FileSpreadsheet className="mr-1 size-3" />
              Exportar Excel
            </Button>
          </div>

          {/* Preview Table(s) — one per section for multi-table reports */}
          <div className="flex-1 space-y-4 overflow-auto rounded-md border">
            {previewData &&
              (previewData.sections?.length
                ? previewData.sections
                : [
                    {
                      subtitle: undefined,
                      columns: previewData.columns,
                      rows: previewData.rows,
                    },
                  ]
              ).map((section, sIdx) => (
                <div key={sIdx}>
                  {section.subtitle && (
                    <div className="bg-muted/50 px-3 py-2 text-sm font-semibold">
                      {section.subtitle}
                    </div>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {section.columns.map((col) => (
                          <TableHead key={col.key} className="whitespace-nowrap text-xs">
                            {col.header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {section.rows.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={section.columns.length}
                            className="text-center text-muted-foreground py-8"
                          >
                            Nenhum registro encontrado para o período selecionado.
                          </TableCell>
                        </TableRow>
                      ) : (
                        section.rows.map((row, idx) => (
                          <TableRow key={idx}>
                            {section.columns.map((col) => (
                              <TableCell
                                key={col.key}
                                className={`text-xs whitespace-nowrap ${
                                  typeof row[col.key] === "number"
                                    ? "text-right tabular-nums"
                                    : ""
                                }`}
                              >
                                {String(row[col.key] ?? "")}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              ))}
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}
