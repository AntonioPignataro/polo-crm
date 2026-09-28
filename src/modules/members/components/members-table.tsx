"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, SquarePen, FileSignature, ChevronRight, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { MemberListItem } from "../queries/get-members";
import { MODULE_LABELS, MEMBER_STATUS_LABELS } from "@/lib/constants";
import { MobileFilterToggle } from "@/shared/components/mobile-filter-toggle";
import { deactivateMember } from "../actions/deactivate-member";
import { SignatureViewDialog } from "./signature-view-dialog";
import type { ModuleType, MemberStatus } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL = "Todos";

function statusBadgeClassName(status: MemberStatus) {
  switch (status) {
    case "ATIVO":
      return "bg-green-600 text-white hover:bg-green-600/90";
    case "INATIVO":
      return "bg-yellow-500 text-white hover:bg-yellow-500/90";
  }
}

function formatModules(modules: ModuleType[]): string {
  if (!modules || modules.length === 0) return "-";
  return modules.map((m) => MODULE_LABELS[m] ?? m).join(", ");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MembersTableProps {
  initialMembers: MemberListItem[];
  userRole: string;
}

export function MembersTable({ initialMembers, userRole }: MembersTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [grupoFilter, setGrupoFilter] = useState<string>(ALL);
  const [moduloFilter, setModuloFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [deactivateDialog, setDeactivateDialog] = useState<{
    open: boolean;
    member: MemberListItem | null;
  }>({ open: false, member: null });
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const canDeactivate =
    userRole === "SUPER_ADMIN" || userRole === "DIRETOR";

  const filtered = useMemo(() => {
    return initialMembers.filter((m) => {
      const matchesSearch = m.fullName
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesGrupo =
        grupoFilter === ALL || m.groupType === grupoFilter;
      const matchesModulo =
        moduloFilter === ALL || m.modules.includes(moduloFilter as ModuleType);
      const matchesStatus =
        statusFilter === ALL || m.status === statusFilter;
      return matchesSearch && matchesGrupo && matchesModulo && matchesStatus;
    });
  }, [initialMembers, search, grupoFilter, moduloFilter, statusFilter]);

  const activeFilterCount = [grupoFilter, moduloFilter, statusFilter].filter(
    (v) => v !== ALL
  ).length;

  function handleDeactivate() {
    if (!deactivateDialog.member) return;
    const memberId = deactivateDialog.member.id;

    setDeactivateError(null);
    startTransition(async () => {
      const result = await deactivateMember(memberId);
      if (result.success) {
        setDeactivateDialog({ open: false, member: null });
        router.refresh();
      } else {
        setDeactivateError(result.error);
      }
    });
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="hidden md:block text-3xl font-bold tracking-tight">Sócios</h1>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/socios/novo">
            <Plus />
            Novo Sócio
          </Link>
        </Button>
      </div>

      {/* Search -- always visible */}
      <div className="relative">
        <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filters -- collapsible on mobile */}
      <MobileFilterToggle activeCount={activeFilterCount}>
        <Select value={grupoFilter} onValueChange={setGrupoFilter}>
          <SelectTrigger className="w-full sm:w-auto">
            <SelectValue placeholder="Grupo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos Grupos</SelectItem>
            <SelectItem value="G1">G1</SelectItem>
            <SelectItem value="G2">G2</SelectItem>
            <SelectItem value="G3">G3</SelectItem>
          </SelectContent>
        </Select>

        <Select value={moduloFilter} onValueChange={setModuloFilter}>
          <SelectTrigger className="w-full sm:w-auto">
            <SelectValue placeholder="Módulo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos Módulos</SelectItem>
            <SelectItem value="QUINTA">Quinta-feira</SelectItem>
            <SelectItem value="SEXTA">Sexta-feira</SelectItem>
            <SelectItem value="SABADO">Sábado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-auto">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos Status</SelectItem>
            <SelectItem value="ATIVO">Ativo</SelectItem>
            <SelectItem value="INATIVO">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </MobileFilterToggle>

      {/* Desktop: Table */}
      <div className="rounded-md border hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Cod</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead>Módulo</TableHead>
              <TableHead>Preceptor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ficha</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-muted-foreground h-24 text-center"
                >
                  Nenhum sócio encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {String(member.code).padStart(3, "0")}
                  </TableCell>
                  <TableCell>{member.fullName}</TableCell>
                  <TableCell>{member.groupType}</TableCell>
                  <TableCell>
                    {formatModules(member.modules)}
                  </TableCell>
                  <TableCell>{member.preceptorName ?? "-"}</TableCell>
                  <TableCell>
                    <Badge className={statusBadgeClassName(member.status)}>
                      {MEMBER_STATUS_LABELS[member.status as MemberStatus] ??
                        member.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {member.signatureStatus.signed > 0 ? (
                      <SignatureViewDialog
                        memberName={member.fullName}
                        enrollmentFormUrl={member.enrollmentFormUrl}
                        signers={member.signers}
                      >
                        <Badge
                          className={`cursor-pointer ${
                            member.signatureStatus.fullySigned
                              ? "bg-green-600 text-white hover:bg-green-700"
                              : "bg-amber-500 text-white hover:bg-amber-600"
                          }`}
                        >
                          <FileSignature className="mr-1 size-3" />
                          {member.signatureStatus.fullySigned
                            ? "Assinada"
                            : `Parcial ${member.signatureStatus.signed}/${member.signatureStatus.required}`}
                        </Badge>
                      </SignatureViewDialog>
                    ) : (
                      <Badge variant="secondary" className="text-muted-foreground">
                        <FileSignature className="mr-1 size-3" />
                        Pendente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" asChild>
                        <Link href={`/socios/${member.id}/ficha`}>
                          <SquarePen className="size-4" />
                          <span className="sr-only">Editar sócio</span>
                        </Link>
                      </Button>
                      {canDeactivate && member.status === "ATIVO" && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-orange-600 hover:text-orange-700"
                          onClick={() =>
                            setDeactivateDialog({ open: true, member })
                          }
                        >
                          <UserMinus className="size-4" />
                          <span className="sr-only">Inativar</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: Cards */}
      <div className="space-y-3 md:hidden">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Nenhum sócio encontrado.
          </p>
        ) : (
          filtered.map((member) => (
            <div
              key={member.id}
              className="rounded-lg border p-4 space-y-2"
            >
              <Link
                href={`/socios/${member.id}/ficha`}
                className="block space-y-2 hover:bg-muted/50 active:bg-muted/70 transition-colors -m-4 p-4 rounded-lg"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{member.fullName}</span>
                  <div className="flex items-center gap-2">
                    <Badge className={statusBadgeClassName(member.status)}>
                      {MEMBER_STATUS_LABELS[member.status as MemberStatus] ?? member.status}
                    </Badge>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cod: {String(member.code).padStart(3, "0")} · {member.groupType} · {formatModules(member.modules)}
                </p>
                {member.preceptorName && (
                  <p className="text-xs text-muted-foreground">
                    Preceptor: {member.preceptorName}
                  </p>
                )}
                <div className="flex items-center pt-1">
                  {member.signatureStatus.signed > 0 ? (
                    <Badge
                      className={`text-xs text-white ${
                        member.signatureStatus.fullySigned
                          ? "bg-green-600"
                          : "bg-amber-500"
                      }`}
                    >
                      <FileSignature className="mr-1 size-3" />
                      {member.signatureStatus.fullySigned
                        ? "Assinada"
                        : `Parcial ${member.signatureStatus.signed}/${member.signatureStatus.required}`}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-muted-foreground text-xs">
                      <FileSignature className="mr-1 size-3" />
                      Pendente
                    </Badge>
                  )}
                </div>
              </Link>
              <div className="flex items-center justify-between pt-1 border-t">
                {member.signatureStatus.signed > 0 && (
                  <SignatureViewDialog
                    memberName={member.fullName}
                    enrollmentFormUrl={member.enrollmentFormUrl}
                    signers={member.signers}
                  >
                    <span className="text-xs text-green-600 cursor-pointer hover:underline flex items-center gap-1">
                      <FileSignature className="size-3" />
                      Ver assinaturas
                    </span>
                  </SignatureViewDialog>
                )}
                {canDeactivate && member.status === "ATIVO" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-orange-600 hover:text-orange-700 ml-auto"
                    onClick={() =>
                      setDeactivateDialog({ open: true, member })
                    }
                  >
                    <UserMinus className="mr-1 size-3" />
                    Inativar
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Count */}
      <p className="text-muted-foreground text-sm">
        Exibindo {filtered.length} de {initialMembers.length} sócios
      </p>

      {/* Deactivate Confirmation Dialog */}
      <ResponsiveDialog
        open={deactivateDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivateDialog({ open: false, member: null });
            setDeactivateError(null);
          }
        }}
      >
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Inativar Sócio</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Tem certeza que deseja inativar{" "}
              <strong>{deactivateDialog.member?.fullName}</strong>? O sócio ficará
              com status inativo e seus pais perderão o acesso ao sistema. Os dados
              não serão excluídos e você poderá reativá-lo a qualquer momento em
              Sócios &gt; Histórico.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          {deactivateError && (
            <p className="text-sm text-destructive rounded-md bg-destructive/10 p-3">
              {deactivateError}
            </p>
          )}
          <ResponsiveDialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setDeactivateDialog({ open: false, member: null })
              }
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={isPending}
            >
              {isPending ? "Inativando..." : "Confirmar Inativação"}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
