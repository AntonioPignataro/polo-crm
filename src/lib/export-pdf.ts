import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ReportData, ReportSection } from "@/modules/reports/queries/get-report-details";

// Extended jsPDF type to include methods added by plugins
interface JsPDFExtended extends jsPDF {
  getNumberOfPages: () => number;
  lastAutoTable?: { finalY: number };
}

/**
 * Generate a PDF document from report data and trigger download.
 */
export function exportToPDF(data: ReportData): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" }) as JsPDFExtended;

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header - Club name
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(data.clubName, 14, 12);

  // Title
  doc.setFontSize(18);
  doc.setTextColor(34, 64, 41); // verde escuro
  doc.text(data.title, 14, 22);

  // Period and generated at
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Período: ${data.period}`, 14, 29);
  doc.text(`Gerado em: ${data.generatedAt}`, pageWidth - 14, 29, {
    align: "right",
  });

  // Separator line
  doc.setDrawColor(34, 64, 41);
  doc.setLineWidth(0.5);
  doc.line(14, 32, pageWidth - 14, 32);

  // Tables — a single table for a normal report, one per section for multi-table.
  const tables: ReportSection[] = data.sections?.length
    ? data.sections
    : [{ columns: data.columns, rows: data.rows }];

  let cursorY = 36;
  let totalRows = 0;
  for (const table of tables) {
    if (table.subtitle) {
      if (cursorY > doc.internal.pageSize.getHeight() - 28) {
        doc.addPage();
        cursorY = 20;
      }
      doc.setFontSize(12);
      doc.setTextColor(34, 64, 41);
      doc.text(table.subtitle, 14, cursorY);
      cursorY += 5;
    }

    const headers = table.columns.map((c) => c.header);
    const body = table.rows.map((row) =>
      table.columns.map((c) => String(row[c.key] ?? ""))
    );

    autoTable(doc, {
      startY: cursorY,
      head: [headers],
      body,
      theme: "grid",
      headStyles: {
        fillColor: [34, 64, 41], // verde polo
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
        halign: "center",
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 2,
      },
      alternateRowStyles: {
        fillColor: [240, 245, 240],
      },
      styles: {
        overflow: "linebreak",
        cellWidth: "auto",
      },
      columnStyles: buildColumnStyles(table.columns),
      margin: { left: 14, right: 14 },
      didDrawPage: (hookData) => {
        // Footer with page number
        const pageCount = doc.getNumberOfPages();
        const currentPage = hookData.pageNumber;
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Página ${currentPage} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: "center" }
        );
        doc.text("Sistema Polo", 14, doc.internal.pageSize.getHeight() - 8);
      },
    });

    cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 10;
    totalRows += table.rows.length;
  }

  // Summary row count
  const finalY = doc.lastAutoTable?.finalY ?? 200;
  if (finalY < doc.internal.pageSize.getHeight() - 20) {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Total de registros: ${totalRows}`, 14, finalY + 8);
  }

  // Download
  const filename = `${data.title.replace(/\s+/g, "_").toLowerCase()}_${data.period.replace(/[\s/]+/g, "_").toLowerCase()}.pdf`;
  doc.save(filename);
}

/**
 * Build column alignment styles - right-align numeric columns
 */
function buildColumnStyles(
  columns: { key: string; header: string }[]
): Record<number, { halign: "left" | "center" | "right" }> {
  const styles: Record<number, { halign: "left" | "center" | "right" }> = {};

  columns.forEach((col, idx) => {
    // First column (usually Name) is left aligned
    if (idx === 0) {
      styles[idx] = { halign: "left" };
      return;
    }

    // Numeric/percentage columns are right-aligned
    const numericPatterns = [
      "Total",
      "(%)",
      "(R$)",
      "Horas",
      "Média",
      "Sessões",
      "Presenças",
      "Pontuais",
      "Inscritos",
      "Empréstimos",
      "Participantes",
      "Presentes",
      "Semanas",
      "Código",
    ];

    const isNumeric = numericPatterns.some((p) =>
      col.header.includes(p) || col.key.includes(p)
    );

    // Category polar columns are numeric
    const polarCategories = [
      "Presença",
      "Pontualidade",
      "Amigo",
      "Esporte",
      "Encargo",
      "Multa",
      "Exercício",
      "Boletim",
      "Resumo",
      "Outros pontos",
      "Livro",
      "Estudo",
    ];

    const isPolar = polarCategories.includes(col.key);

    if (isNumeric || isPolar) {
      styles[idx] = { halign: "right" };
    } else {
      styles[idx] = { halign: "left" };
    }
  });

  return styles;
}
