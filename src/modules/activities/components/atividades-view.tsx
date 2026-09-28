"use client";

import { useState } from "react";
import {
  Plus,
  Calendar,
  Users,
  DollarSign,
  MapPin,
  ChevronRight,
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
  CardTitle,
} from "@/components/ui/card";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { ACTIVITY_STATUS_LABELS } from "@/lib/constants";
import { ActivityFormDialog } from "@/modules/activities/components/activity-form-dialog";
import { ActivityEditDialog } from "@/modules/activities/components/activity-edit-dialog";
import { ActivityConfirmDialog } from "@/modules/activities/components/activity-confirm-dialog";
import { MonitorActivityDialog } from "@/modules/activities/components/monitor-activity-dialog";
import { ActivityParticipantsView } from "@/modules/activities/components/activity-participants-view";
import type { ActivityItem } from "@/modules/activities/queries/get-activities";
import type { ActivityStatus } from "@/types";

function statusBadgeClass(status: ActivityStatus): string {
  switch (status) {
    case "PLANEJADA":
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    case "INSCRICOES_ABERTAS":
      return "bg-green-100 text-green-800 hover:bg-green-100";
    case "INSCRICOES_ENCERRADAS":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
    case "CONCLUIDA":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    case "CANCELADA":
      return "bg-red-100 text-red-800 hover:bg-red-100";
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR");
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface AtividadesViewProps {
  activities: ActivityItem[];
  isParent: boolean;
  isUsuario: boolean;
  isMonitorPlus: boolean;
  canEditActivities: boolean;
  sessionParentId: string | null;
  sessionUserId: string;
}

export function AtividadesView({
  activities,
  isParent,
  isUsuario,
  isMonitorPlus,
  canEditActivities,
  sessionParentId,
  sessionUserId,
}: AtividadesViewProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<ActivityItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editActivity, setEditActivity] = useState<ActivityItem | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmActivity, setConfirmActivity] = useState<ActivityItem | null>(null);
  const [monitorDialogOpen, setMonitorDialogOpen] = useState(false);
  const [monitorDialogActivity, setMonitorDialogActivity] = useState<ActivityItem | null>(null);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [participantsActivity, setParticipantsActivity] = useState<ActivityItem | null>(null);

  const showParentView = isParent && isUsuario;
  const showAdminView = !isUsuario;
  // MONITOR+ can register themselves (and children if also a parent)
  const showMonitorRegister = isMonitorPlus;

  function handleOpenDetail(atividade: ActivityItem) {
    setSelected(atividade);
    setDetailOpen(true);
  }

  function handleOpenConfirm(atividade: ActivityItem) {
    setConfirmActivity(atividade);
    setConfirmOpen(true);
  }

  function handleOpenMonitorDialog(atividade: ActivityItem) {
    setMonitorDialogActivity(atividade);
    setMonitorDialogOpen(true);
  }

  function handleOpenParticipants(atividade: ActivityItem) {
    setParticipantsActivity(atividade);
    setParticipantsOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="hidden md:block">
          <h1 className="text-3xl font-bold tracking-tight">Atividades</h1>
          <p className="text-muted-foreground mt-1">
            {showParentView
              ? "Veja as atividades do clube e confirme a presença da sua família."
              : "Planeje e acompanhe as atividades do clube."}
          </p>
        </div>
        {showAdminView && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 size-4" />
            Nova Atividade
          </Button>
        )}
      </div>

      {showAdminView && (
        <ActivityFormDialog open={formOpen} onOpenChange={setFormOpen} />
      )}

      {/* Activities Grid */}
      {activities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma atividade cadastrada.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((a) => (
            <Card
              key={a.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => handleOpenDetail(a)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base leading-tight">
                    {a.name}
                  </CardTitle>
                  <Badge className={statusBadgeClass(a.status)}>
                    {ACTIVITY_STATUS_LABELS[a.status]}
                  </Badge>
                </div>
                {a.location && (
                  <CardDescription className="flex items-center gap-1 text-xs">
                    <MapPin className="size-3" />
                    {a.location}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {a.startDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="text-muted-foreground size-4" />
                      <span>
                        {formatDate(a.startDate)}
                        {a.endDate && a.startDate !== a.endDate && ` - ${formatDate(a.endDate)}`}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="text-muted-foreground size-4" />
                    <span>
                      {a.totalInscritos}
                      {a.maxVagas ? `/${a.maxVagas}` : ""} inscritos
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t pt-3 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <DollarSign className="size-4" />
                    <span>
                      Sócio:{" "}
                      {a.custoSocio == null || a.custoSocio === 0
                        ? "Gratuito"
                        : formatCurrency(a.custoSocio)}
                    </span>
                  </div>
                  {showParentView ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenConfirm(a);
                      }}
                    >
                      <UserCheck className="mr-1 size-3" />
                      Confirmar presença
                    </Button>
                  ) : showAdminView ? (
                    <div className="flex items-center gap-1">
                      {showMonitorRegister && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenMonitorDialog(a);
                          }}
                        >
                          <UserCheck className="mr-1 size-3" />
                          Inscrever-se
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenParticipants(a);
                        }}
                      >
                        <Users className="mr-1 size-3" />
                        Ver inscritos
                      </Button>
                    </div>
                  ) : (
                    <ChevronRight className="text-muted-foreground size-4" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <ResponsiveDialog open={detailOpen} onOpenChange={setDetailOpen}>
        <ResponsiveDialogContent className="max-w-lg">
          {selected && (
            <>
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle>{selected.name}</ResponsiveDialogTitle>
                <ResponsiveDialogDescription>
                  {selected.description ?? "Sem descrição."}
                </ResponsiveDialogDescription>
              </ResponsiveDialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className={statusBadgeClass(selected.status)}>
                    {ACTIVITY_STATUS_LABELS[selected.status]}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selected.startDate && (
                    <div>
                      <p className="text-muted-foreground text-xs">Datas</p>
                      <p className="font-medium">
                        {formatDate(selected.startDate)}
                        {selected.endDate &&
                          selected.startDate !== selected.endDate &&
                          ` a ${formatDate(selected.endDate)}`}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground text-xs">Inscritos</p>
                    <p className="font-medium">
                      {selected.totalInscritos}
                      {selected.maxVagas ? ` / ${selected.maxVagas}` : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Responsável</p>
                    <p className="font-medium">{selected.responsavel}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Custo por Sócio
                    </p>
                    <p className="font-medium">
                      {selected.custoSocio == null || selected.custoSocio === 0
                        ? "Gratuito"
                        : formatCurrency(selected.custoSocio)}
                    </p>
                  </div>
                </div>

                {selected.inscritos.length > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-2 text-xs font-medium">
                      Inscritos ({selected.inscritos.length})
                    </p>
                    <ul className="space-y-1">
                      {selected.inscritos.map((name) => (
                        <li
                          key={name}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span className="size-1.5 rounded-full bg-primary" />
                          {name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <ResponsiveDialogFooter className="gap-2">
                {showParentView && (
                  <Button
                    onClick={() => {
                      setDetailOpen(false);
                      handleOpenConfirm(selected);
                    }}
                  >
                    <UserCheck className="mr-1 size-4" />
                    Confirmar presença
                  </Button>
                )}
                {showAdminView && showMonitorRegister && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setDetailOpen(false);
                      handleOpenMonitorDialog(selected);
                    }}
                  >
                    <UserCheck className="mr-1 size-4" />
                    Inscrever-se
                  </Button>
                )}
                {showAdminView && (
                  <Button
                    onClick={() => {
                      setDetailOpen(false);
                      handleOpenParticipants(selected);
                    }}
                  >
                    <Users className="mr-1 size-4" />
                    Ver inscritos
                  </Button>
                )}
                {showAdminView && canEditActivities && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditActivity(selected);
                      setDetailOpen(false);
                      setEditOpen(true);
                    }}
                  >
                    <Pencil className="mr-1 size-4" />
                    Editar
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setDetailOpen(false)}
                >
                  Fechar
                </Button>
              </ResponsiveDialogFooter>
            </>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Parent Confirm Dialog */}
      {showParentView && sessionParentId && confirmActivity && (
        <ActivityConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          activityId={confirmActivity.id}
          activityName={confirmActivity.name}
          parentId={sessionParentId}
          userId={sessionUserId}
        />
      )}

      {/* Monitor Self-Registration Dialog */}
      {showMonitorRegister && monitorDialogActivity && (
        <MonitorActivityDialog
          open={monitorDialogOpen}
          onOpenChange={setMonitorDialogOpen}
          activityId={monitorDialogActivity.id}
          activityName={monitorDialogActivity.name}
        />
      )}

      {/* Admin Participants View */}
      {showAdminView && participantsActivity && (
        <ActivityParticipantsView
          open={participantsOpen}
          onOpenChange={setParticipantsOpen}
          activityId={participantsActivity.id}
          activityName={participantsActivity.name}
        />
      )}

      {/* Edit Dialog */}
      {showAdminView && canEditActivities && (
        <ActivityEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          activity={editActivity}
        />
      )}
    </div>
  );
}
