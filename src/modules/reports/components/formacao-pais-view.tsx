"use client";

import { Fragment, useState, useTransition } from "react";
import {
  GraduationCap,
  Plus,
  ChevronDown,
  ChevronUp,
  Users,
  Check,
  X,
  UserCheck,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
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
import { StatStrip } from "@/shared/components/stat-strip";
import { FORMATION_TYPE_LABELS } from "@/lib/constants";
import { FormationFormDialog } from "@/modules/reports/components/formation-form-dialog";
import { FormationEditDialog } from "@/modules/reports/components/formation-edit-dialog";
import { FormationAttendanceDialog } from "@/modules/reports/components/formation-attendance-dialog";
import { confirmFormationPresence } from "@/modules/reports/actions/confirm-formation-presence";
import type { FormationItem } from "@/modules/reports/queries/get-formations";
import type { FormationType } from "@/types";

function tipoBadgeClass(tipo: FormationType): string {
  switch (tipo) {
    case "FORMACAO_PAI":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    case "FORMACAO_CASAL":
      return "bg-pink-100 text-pink-800 hover:bg-pink-100";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR");
}

interface FormacaoPaisViewProps {
  formations: FormationItem[];
  isParent: boolean;
  isUsuario: boolean;
  canEditFormations: boolean;
  canMarkAttendance: boolean;
  parentSex: string | null;
  parentRelationship: string | null;
  sessionParentId: string | null;
}

export function FormacaoPaisView({
  formations,
  isParent,
  isUsuario,
  canEditFormations,
  canMarkAttendance,
  parentSex,
  parentRelationship,
  sessionParentId,
}: FormacaoPaisViewProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editFormation, setEditFormation] = useState<FormationItem | null>(null);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [attendanceFormation, setAttendanceFormation] = useState<FormationItem | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmFormation, setConfirmFormation] = useState<FormationItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmError, setConfirmError] = useState("");
  const [confirmSuccess, setConfirmSuccess] = useState("");

  function handleOpenEdit(f: FormationItem) {
    setEditFormation(f);
    setEditOpen(true);
  }

  function handleOpenAttendance(f: FormationItem) {
    setAttendanceFormation(f);
    setAttendanceOpen(true);
  }

  const showParentView = isParent && isUsuario;
  const showAdminView = !isUsuario;

  function toggleRow(id: string) {
    setExpandedRow((prev) => (prev === id ? null : id));
  }

  // Determine if this parent can confirm for a given formation type
  function canConfirmForType(tipo: FormationType): boolean {
    if (!showParentView || !sessionParentId) return false;

    if (tipo === "FORMACAO_CASAL") {
      // All parents can confirm
      return true;
    }

    // FORMACAO_PAI: only male parents can see the confirm button
    const isMale =
      parentRelationship === "PAI" ||
      (parentRelationship === "RESPONSAVEL" && parentSex === "MASCULINO");

    return isMale;
  }

  function handleOpenConfirm(formation: FormationItem) {
    setConfirmFormation(formation);
    setConfirmError("");
    setConfirmSuccess("");
    setConfirmOpen(true);
  }

  function handleConfirm() {
    if (!confirmFormation || !sessionParentId) return;

    startTransition(async () => {
      const result = await confirmFormationPresence({
        formationId: confirmFormation.id,
      });

      if (result.success) {
        setConfirmSuccess("Presença confirmada!");
        setConfirmError("");
        setTimeout(() => {
          setConfirmOpen(false);
          window.location.reload();
        }, 1000);
      } else {
        setConfirmError(result.error);
        setConfirmSuccess("");
      }
    });
  }

  const totalPresentes = formations.reduce((acc, f) => acc + f.presentes, 0);
  const totalConfirmados = formations.reduce(
    (acc, f) => acc + f.confirmados,
    0
  );
  const avgPresenca =
    totalConfirmados > 0
      ? Math.round((totalPresentes / totalConfirmados) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="hidden md:block">
          <h1 className="text-3xl font-bold tracking-tight">
            Formação de Pais
          </h1>
          <p className="text-muted-foreground mt-1">
            {showParentView
              ? "Confirme sua presença nas formações."
              : "Gerencie as formações para pais e casais."}
          </p>
        </div>
        {showAdminView && (
          <Button onClick={() => setFormOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 size-4" />
            Nova Formação
          </Button>
        )}
      </div>

      {showAdminView && (
        <FormationFormDialog open={formOpen} onOpenChange={setFormOpen} />
      )}

      {/* Summary cards */}
      <StatStrip desktopCols={2}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Total de Formações
            </CardDescription>
            <GraduationCap className="size-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Presenças Verificadas
            </CardDescription>
            <Users className="size-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPresentes}</div>
            <p className="text-xs text-muted-foreground">
              {totalConfirmados} RSVPs ({avgPresenca}% comparecimento)
            </p>
          </CardContent>
        </Card>
      </StatStrip>

      {/* Table / Cards */}
      <Card>
        <CardContent className="pt-6">
          {formations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma formação cadastrada.
            </p>
          ) : (
            <>
              {/* Desktop: Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Presentes / Confirmados</TableHead>
                      {showParentView && <TableHead className="w-32" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formations.map((f) => (
                      <Fragment key={f.id}>
                        <TableRow
                          className="cursor-pointer"
                          onClick={() => toggleRow(f.id)}
                        >
                          <TableCell>
                            {expandedRow === f.id ? (
                              <ChevronUp className="size-4" />
                            ) : (
                              <ChevronDown className="size-4" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{f.nome}</TableCell>
                          <TableCell>
                            <Badge className={tipoBadgeClass(f.tipo)}>
                              {FORMATION_TYPE_LABELS[f.tipo]}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(f.data)}</TableCell>
                          <TableCell>
                            {f.presentes} / {f.confirmados}
                          </TableCell>
                          {showParentView && (
                            <TableCell>
                              {canConfirmForType(f.tipo) && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenConfirm(f);
                                  }}
                                >
                                  <UserCheck className="mr-1 size-3" />
                                  Confirmar
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                        {expandedRow === f.id && (
                          <TableRow>
                            <TableCell colSpan={showParentView ? 6 : 5}>
                              <div className="rounded-md bg-muted/50 p-4">
                                {f.descricao && (
                                  <p className="mb-2 text-sm text-muted-foreground">
                                    {f.descricao}
                                  </p>
                                )}
                                <p className="mb-3 text-xs font-medium text-muted-foreground">
                                  Lista de Presença
                                </p>
                                {f.participantes.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">
                                    Nenhum registro até o momento.
                                  </p>
                                ) : (
                                  <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                                    {f.participantes.map((p) => (
                                      <div
                                        key={p.id}
                                        className="flex items-center gap-2 text-sm"
                                      >
                                        {p.presente ? (
                                          <Check className="size-4 text-green-600" />
                                        ) : (
                                          <span
                                            className="size-2 rounded-full bg-muted-foreground/40"
                                            aria-hidden
                                          />
                                        )}
                                        <span
                                          className={
                                            p.presente
                                              ? ""
                                              : "text-muted-foreground"
                                          }
                                        >
                                          {p.name}
                                        </span>
                                        {!p.presente && p.confirmou && (
                                          <Badge
                                            variant="outline"
                                            className="text-[10px] py-0 px-1"
                                          >
                                            RSVP
                                          </Badge>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {showAdminView && (canMarkAttendance || canEditFormations) && (
                                  <div className="mt-4 flex justify-end gap-2">
                                    {canMarkAttendance && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenAttendance(f);
                                        }}
                                      >
                                        <UserCheck className="mr-1 size-3" />
                                        Lançar presença
                                      </Button>
                                    )}
                                    {canEditFormations && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenEdit(f);
                                        }}
                                      >
                                        <Pencil className="mr-1 size-3" />
                                        Editar formação
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: Expandable Cards */}
              <div className="space-y-3 md:hidden">
                {formations.map((f) => (
                  <div
                    key={f.id}
                    className="rounded-lg border overflow-hidden"
                  >
                    <button
                      type="button"
                      className="w-full p-3 text-left space-y-1 hover:bg-muted/50 transition-colors"
                      onClick={() => toggleRow(f.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">{f.nome}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={tipoBadgeClass(f.tipo)}>
                            {FORMATION_TYPE_LABELS[f.tipo]}
                          </Badge>
                          {expandedRow === f.id ? (
                            <ChevronUp className="size-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="size-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(f.data)} · {f.presentes} presentes · {f.confirmados} RSVPs
                      </p>
                    </button>
                    {showParentView && canConfirmForType(f.tipo) && (
                      <div className="px-3 pb-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full"
                          onClick={() => handleOpenConfirm(f)}
                        >
                          <UserCheck className="mr-1 size-3" />
                          Confirmar presença
                        </Button>
                      </div>
                    )}
                    {expandedRow === f.id && (
                      <div className="border-t bg-muted/50 p-3 space-y-2">
                        {f.descricao && (
                          <p className="text-sm text-muted-foreground">
                            {f.descricao}
                          </p>
                        )}
                        <p className="text-xs font-medium text-muted-foreground">
                          Lista de Presença
                        </p>
                        {f.participantes.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Nenhum registro até o momento.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {f.participantes.map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center gap-2 text-sm"
                              >
                                {p.presente ? (
                                  <Check className="size-3 text-green-600" />
                                ) : (
                                  <span
                                    className="size-2 rounded-full bg-muted-foreground/40"
                                    aria-hidden
                                  />
                                )}
                                <span
                                  className={
                                    p.presente
                                      ? "text-sm"
                                      : "text-sm text-muted-foreground"
                                  }
                                >
                                  {p.name}
                                </span>
                                {!p.presente && p.confirmou && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] py-0 px-1"
                                  >
                                    RSVP
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {showAdminView && canMarkAttendance && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full mt-2"
                            onClick={() => handleOpenAttendance(f)}
                          >
                            <UserCheck className="mr-1 size-3" />
                            Lançar presença
                          </Button>
                        )}
                        {showAdminView && canEditFormations && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full mt-2"
                            onClick={() => handleOpenEdit(f)}
                          >
                            <Pencil className="mr-1 size-3" />
                            Editar formação
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {showAdminView && canEditFormations && (
        <FormationEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          formation={editFormation}
        />
      )}

      {/* Attendance Dialog */}
      {showAdminView && canMarkAttendance && (
        <FormationAttendanceDialog
          open={attendanceOpen}
          onOpenChange={setAttendanceOpen}
          formationId={attendanceFormation?.id ?? null}
          formationName={attendanceFormation?.nome ?? null}
        />
      )}

      {/* Confirm Presence Dialog */}
      <ResponsiveDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <ResponsiveDialogContent className="max-w-sm">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Confirmar presença</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {confirmFormation
                ? `Confirmar sua presença em: ${confirmFormation.nome}`
                : "Confirmar presença na formação."}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-2">
            {confirmError && (
              <p className="text-sm text-destructive">{confirmError}</p>
            )}
            {confirmSuccess && (
              <p className="text-sm text-green-600">{confirmSuccess}</p>
            )}
          </div>

          <ResponsiveDialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending ? "Confirmando..." : "Confirmar presença"}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}
