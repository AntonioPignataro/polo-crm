"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { MODULE_LABELS } from "@/lib/constants";
import type { InactiveMemberItem } from "../queries/get-inactive-members";
import { reactivateMember } from "../actions/reactivate-member";
import type { ModuleType } from "@/types";

function formatModules(modules: ModuleType[]): string {
  if (!modules || modules.length === 0) return "-";
  return modules.map((m) => MODULE_LABELS[m] ?? m).join(", ");
}

interface MemberHistoryTableProps {
  members: InactiveMemberItem[];
}

export function MemberHistoryTable({ members }: MemberHistoryTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    member: InactiveMemberItem | null;
  }>({ open: false, member: null });
  const [error, setError] = useState<string | null>(null);

  function handleReactivate() {
    if (!confirmDialog.member) return;
    const memberId = confirmDialog.member.id;

    setError(null);
    startTransition(async () => {
      const result = await reactivateMember(memberId);
      if (result.success) {
        setConfirmDialog({ open: false, member: null });
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="hidden md:block">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <History className="size-8" />
            Histórico de Sócios
          </h1>
          <p className="text-muted-foreground mt-1">
            Sócios inativos do clube. Você pode reativá-los quando necessário.
          </p>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="rounded-md border p-8 text-center text-muted-foreground">
          Nenhum sócio inativo encontrado.
        </div>
      ) : (
        <>
          {/* Desktop: Table */}
          <div className="rounded-md border hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Cod</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Inativado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {String(member.code).padStart(3, "0")}
                    </TableCell>
                    <TableCell>{member.fullName}</TableCell>
                    <TableCell>{member.groupType}</TableCell>
                    <TableCell>{formatModules(member.modules)}</TableCell>
                    <TableCell>
                      {new Date(member.updatedAt + "T12:00:00").toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setConfirmDialog({ open: true, member })
                        }
                        disabled={isPending}
                      >
                        <RotateCcw className="mr-1 size-3" />
                        Reativar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: Cards */}
          <div className="space-y-3 md:hidden">
            {members.map((member) => (
              <div
                key={member.id}
                className="rounded-lg border p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{member.fullName}</span>
                  <Badge className="bg-yellow-500 text-white hover:bg-yellow-500/90">
                    Inativo
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cod: {String(member.code).padStart(3, "0")} · {member.groupType} · {formatModules(member.modules)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Inativado em:{" "}
                  {new Date(member.updatedAt + "T12:00:00").toLocaleDateString("pt-BR")}
                </p>
                <div className="flex justify-end pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setConfirmDialog({ open: true, member })
                    }
                    disabled={isPending}
                  >
                    <RotateCcw className="mr-1 size-3" />
                    Reativar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="text-muted-foreground text-sm">
        {members.length} sócio(s) inativo(s)
      </p>

      {/* Confirm Dialog */}
      <ResponsiveDialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDialog({ open: false, member: null });
            setError(null);
          }
        }}
      >
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Reativar Sócio</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Tem certeza que deseja reativar{" "}
              <strong>{confirmDialog.member?.fullName}</strong>? O sócio voltará
              ao status ativo e seus pais recuperarão o acesso ao sistema.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          {error && (
            <p className="text-sm text-destructive rounded-md bg-destructive/10 p-3">
              {error}
            </p>
          )}
          <ResponsiveDialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, member: null })}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button onClick={handleReactivate} disabled={isPending}>
              {isPending ? "Reativando..." : "Confirmar Reativação"}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
