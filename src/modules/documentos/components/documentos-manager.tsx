"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2, Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadReportFile } from "@/modules/documentos/actions/upload-file";
import { deleteReportFile } from "@/modules/documentos/actions/delete-file";
import { getReportFileDownloadUrl } from "@/modules/documentos/actions/get-download-url";
import type { DocumentoItem } from "@/modules/documentos/queries/get-documentos";

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentosManager({ files }: { files: DocumentoItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [visibility, setVisibility] = useState("MONITOR");
  const [name, setName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      alert("Selecione um arquivo.");
      return;
    }
    const fd = new FormData();
    fd.set("file", file);
    fd.set("name", name);
    fd.set("visibility", visibility);
    startTransition(async () => {
      const res = await uploadReportFile(fd);
      if (res.success) {
        setName("");
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      } else {
        alert(res.error);
      }
    });
  }

  async function handleDownload(id: string) {
    setBusyId(id);
    const res = await getReportFileDownloadUrl(id);
    setBusyId(null);
    if (res.success) window.open(res.data.url, "_blank");
    else alert(res.error);
  }

  function handleDelete(id: string) {
    if (!confirm("Excluir este arquivo permanentemente?")) return;
    setBusyId(id);
    startTransition(async () => {
      const res = await deleteReportFile(id);
      setBusyId(null);
      if (res.success) router.refresh();
      else alert(res.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="size-5" />
          Documentos e Arquivos
        </CardTitle>
        <CardDescription>
          Envie arquivos para download. Marque &quot;Todos&quot; para deixá-los
          visíveis também aos pais (na tela Documentos).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          onSubmit={handleUpload}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1 space-y-1">
            <Label>Arquivo</Label>
            <Input type="file" ref={fileRef} />
          </div>
          <div className="space-y-1">
            <Label>Nome (opcional)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Circular Maio"
            />
          </div>
          <div className="space-y-1">
            <Label>Visível para</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MONITOR">Só monitores+</SelectItem>
                <SelectItem value="ALL">Todos (inclui pais)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <Upload className="mr-1 size-4" />
            )}
            Enviar
          </Button>
        </form>

        {files.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhum arquivo enviado ainda.
          </p>
        ) : (
          <div className="divide-y rounded-md border">
            {files.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between gap-3 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(f.sizeBytes)} · {f.uploaderName ?? "—"} ·{" "}
                    {new Date(f.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      f.visibility === "ALL"
                        ? "border-green-300 text-green-700"
                        : ""
                    }
                  >
                    {f.visibility === "ALL" ? "Todos" : "Monitores+"}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={busyId === f.id}
                    onClick={() => handleDownload(f.id)}
                    title="Baixar"
                  >
                    <Download className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={busyId === f.id}
                    onClick={() => handleDelete(f.id)}
                    title="Excluir"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
