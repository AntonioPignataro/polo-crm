"use client";

import { useState } from "react";
import { FileText, Download, BookOpen, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getReportFileDownloadUrl } from "@/modules/documentos/actions/get-download-url";
import type { DocumentoItem } from "@/modules/documentos/queries/get-documentos";

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentosView({ files }: { files: DocumentoItem[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function download(id: string) {
    setBusyId(id);
    const res = await getReportFileDownloadUrl(id);
    setBusyId(null);
    if (res.success) window.open(res.data.url, "_blank");
    else alert(res.error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Documentos</h1>
        <p className="mt-1 text-muted-foreground">
          Materiais do clube disponíveis para download.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {/* Manual — always available to everyone */}
            <a
              href="/manual-clube-polo-1-semestre-2026.pdf"
              download
              className="flex items-center justify-between gap-3 p-4 hover:bg-muted/50"
            >
              <div className="flex min-w-0 items-center gap-3">
                <BookOpen className="size-5 shrink-0 text-blue-600" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    Manual Clube Polo — 1º Semestre 2026
                  </p>
                  <p className="text-xs text-muted-foreground">PDF</p>
                </div>
              </div>
              <Download className="size-4 shrink-0 text-muted-foreground" />
            </a>

            {files.map((f) => (
              <button
                key={f.id}
                onClick={() => download(f.id)}
                disabled={busyId === f.id}
                className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted/50 disabled:opacity-60"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="size-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{f.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(f.sizeBytes)}
                    </p>
                  </div>
                </div>
                {busyId === f.id ? (
                  <Loader2 className="size-4 shrink-0 animate-spin" />
                ) : (
                  <Download className="size-4 shrink-0 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
