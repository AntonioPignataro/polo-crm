import ExcelJS from "exceljs";
import type { ReportData, ReportSection } from "@/modules/reports/queries/get-report-details";

/**
 * Generate an Excel buffer from report data (server-side, no browser APIs).
 * Same styling as export-excel.ts but returns a Buffer instead of triggering download.
 * Supports single-table and multi-table (data.sections) reports.
 */
export async function generateExcelBuffer(
  data: ReportData
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema Polo";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(data.title, {
    properties: { defaultColWidth: 18 },
  });

  const tables: ReportSection[] = data.sections?.length
    ? data.sections
    : [{ columns: data.columns, rows: data.rows }];
  const maxCols = Math.max(...tables.map((t) => t.columns.length), 1);

  // ========== Header Section ==========
  worksheet.mergeCells(1, 1, 1, maxCols);
  const clubCell = worksheet.getCell(1, 1);
  clubCell.value = data.clubName;
  clubCell.font = { size: 10, color: { argb: "FF666666" } };

  worksheet.mergeCells(2, 1, 2, maxCols);
  const titleCell = worksheet.getCell(2, 1);
  titleCell.value = data.title;
  titleCell.font = { size: 16, bold: true, color: { argb: "FF224029" } };

  worksheet.mergeCells(3, 1, 3, Math.max(Math.ceil(maxCols / 2), 1));
  const periodCell = worksheet.getCell(3, 1);
  periodCell.value = `Período: ${data.period}`;
  periodCell.font = { size: 10, color: { argb: "FF666666" } };

  if (maxCols > 1) {
    worksheet.mergeCells(3, Math.ceil(maxCols / 2) + 1, 3, maxCols);
    const genCell = worksheet.getCell(3, Math.ceil(maxCols / 2) + 1);
    genCell.value = `Gerado em: ${data.generatedAt}`;
    genCell.font = { size: 10, color: { argb: "FF666666" } };
    genCell.alignment = { horizontal: "right" };
  }

  worksheet.addRow([]); // spacer

  // ========== Tables ==========
  let totalRows = 0;
  for (const table of tables) {
    if (table.subtitle) {
      const subRow = worksheet.addRow([table.subtitle]);
      if (table.columns.length > 1) {
        worksheet.mergeCells(subRow.number, 1, subRow.number, table.columns.length);
      }
      subRow.getCell(1).font = { bold: true, size: 11, color: { argb: "FF224029" } };
    }

    const headerRow = worksheet.addRow(table.columns.map((c) => c.header));
    headerRow.eachCell((cell, colNumber) => {
      if (colNumber > table.columns.length) return;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF224029" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FF224029" } },
        bottom: { style: "thin", color: { argb: "FF224029" } },
        left: { style: "thin", color: { argb: "FFE0E0E0" } },
        right: { style: "thin", color: { argb: "FFE0E0E0" } },
      };
    });

    table.rows.forEach((row, rowIdx) => {
      const excelRow = worksheet.addRow(table.columns.map((c) => row[c.key] ?? ""));
      excelRow.eachCell((cell, colNumber) => {
        const col = table.columns[colNumber - 1];
        if (!col) return;
        const isNumeric = typeof row[col.key] === "number";

        cell.font = { size: 9 };
        cell.alignment = {
          horizontal: isNumeric ? "right" : "left",
          vertical: "middle",
        };

        if (rowIdx % 2 === 1) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF0F5F0" },
          };
        }

        cell.border = {
          bottom: { style: "thin", color: { argb: "FFE8E8E8" } },
          left: { style: "thin", color: { argb: "FFE8E8E8" } },
          right: { style: "thin", color: { argb: "FFE8E8E8" } },
        };

        if (col.key.includes("R$") && isNumeric) {
          cell.numFmt = "#,##0.00";
        }
        if (col.key.includes("%") && isNumeric) {
          cell.numFmt = '0"%"';
        }
      });
    });

    worksheet.addRow([]); // spacer between tables
    totalRows += table.rows.length;
  }

  // ========== Summary Row ==========
  const summaryRowNum = worksheet.rowCount + 1;
  worksheet.mergeCells(summaryRowNum, 1, summaryRowNum, maxCols);
  const summaryCell = worksheet.getCell(summaryRowNum, 1);
  summaryCell.value = `Total de registros: ${totalRows}`;
  summaryCell.font = { size: 9, italic: true, color: { argb: "FF888888" } };

  // ========== Auto-fit column widths (max across all tables) ==========
  for (let idx = 0; idx < maxCols; idx++) {
    let maxWidth = 10;
    for (const table of tables) {
      const col = table.columns[idx];
      if (!col) continue;
      if (col.header.length > maxWidth) maxWidth = col.header.length;
      table.rows.forEach((row) => {
        const val = String(row[col.key] ?? "");
        if (val.length > maxWidth) maxWidth = val.length;
      });
    }
    worksheet.getColumn(idx + 1).width = Math.min(Math.max(maxWidth + 4, 10), 40);
  }

  // Return as Buffer
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
