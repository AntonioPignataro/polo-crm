"use client";

import { useEffect, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/constants";
import {
  updateAppointmentSchema,
  type UpdateAppointmentInput,
} from "@/modules/appointments/schemas/appointment-schema";
import { updateAppointment } from "@/modules/appointments/actions/update-appointment";
import { deleteAppointment } from "@/modules/appointments/actions/delete-appointment";
import {
  getAppointmentDetail,
  type AppointmentDetail,
} from "@/modules/appointments/queries/get-appointment-detail";

interface AppointmentDetailDialogProps {
  appointmentId: string | null;
  onClose: () => void;
  currentUserId: string;
  currentUserRole: string;
}

export function AppointmentDetailDialog({
  appointmentId,
  onClose,
  currentUserId,
  currentUserRole,
}: AppointmentDetailDialogProps) {
  const [detail, setDetail] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const canEdit =
    detail &&
    (currentUserRole === "SUPER_ADMIN" ||
      currentUserRole === "DIRETOR" ||
      detail.conductedById === currentUserId);

  const isPreceptoria =
    detail?.tipo === "PRECEPTORIA_SOCIO" || detail?.tipo === "PRECEPTORIA_PAIS";
  const isSacerdote = detail?.tipo === "SACERDOTE";

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<UpdateAppointmentInput>({
    resolver: zodResolver(updateAppointmentSchema),
  });

  useEffect(() => {
    if (!appointmentId) {
      setDetail(null);
      setEditing(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    getAppointmentDetail(appointmentId)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        setLoading(false);
        if (d) {
          reset({
            id: d.id,
            date: d.date,
            notes: d.notes ?? "",
            purposes: d.purposes ?? "",
            lifePlan: d.lifePlan ?? "",
          });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setDetail(null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [appointmentId, reset]);

  function onSubmit(data: UpdateAppointmentInput) {
    startTransition(async () => {
      try {
        const result = await updateAppointment(data);
        if (result.success) {
          setEditing(false);
          // Refresh detail
          const updated = await getAppointmentDetail(data.id);
          setDetail(updated);
          if (updated) {
            reset({
              id: updated.id,
              date: updated.date,
              notes: updated.notes ?? "",
              purposes: updated.purposes ?? "",
              lifePlan: updated.lifePlan ?? "",
            });
          }
        }
      } catch {
        // Silently handle — the UI will remain in edit mode
      }
    });
  }

  function handleClose() {
    setEditing(false);
    setConfirmDeleteOpen(false);
    setDeleteError(null);
    onClose();
  }

  function handleConfirmDelete() {
    if (!detail) return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteAppointment(detail.id);
      if (result.success) {
        setConfirmDeleteOpen(false);
        handleClose();
        // Force a refresh so the deleted row disappears from the list.
        window.location.reload();
      } else {
        setDeleteError(result.error);
      }
    });
  }

  return (
    <ResponsiveDialog open={!!appointmentId} onOpenChange={(open) => !open && handleClose()}>
      <ResponsiveDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Detalhes do Atendimento</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {detail
              ? `${APPOINTMENT_TYPE_LABELS[detail.tipo as keyof typeof APPOINTMENT_TYPE_LABELS]} — ${detail.socio}`
              : "Carregando..."}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {loading && (
          <p className="py-8 text-center text-muted-foreground text-sm">
            Carregando...
          </p>
        )}

        {!loading && !detail && (
          <p className="py-8 text-center text-muted-foreground text-sm">
            Atendimento não encontrado.
          </p>
        )}

        {!loading && detail && !editing && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Data</p>
                <p className="font-medium">
                  {new Date(detail.date + "T12:00:00").toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Tipo</p>
                <p className="font-medium">
                  {APPOINTMENT_TYPE_LABELS[detail.tipo as keyof typeof APPOINTMENT_TYPE_LABELS]}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Sócio</p>
                <p className="font-medium">{detail.socio}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Realizado por</p>
                <p className="font-medium">{detail.realizadoPor}</p>
              </div>
            </div>

            {!isSacerdote && detail.notes && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Observações</p>
                <p className="text-sm whitespace-pre-wrap">{detail.notes}</p>
              </div>
            )}

            {isPreceptoria && detail.purposes && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Propósitos</p>
                <p className="text-sm whitespace-pre-wrap">{detail.purposes}</p>
              </div>
            )}

            {isPreceptoria && detail.lifePlan && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Plano de vida</p>
                <p className="text-sm whitespace-pre-wrap">{detail.lifePlan}</p>
              </div>
            )}

            <ResponsiveDialogFooter>
              {canEdit && (
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    setDeleteError(null);
                    setConfirmDeleteOpen(true);
                  }}
                >
                  <Trash2 className="mr-2 size-4" />
                  Excluir
                </Button>
              )}
              {canEdit && (
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Pencil className="mr-2 size-4" />
                  Editar
                </Button>
              )}
              <Button variant="outline" onClick={handleClose}>
                Fechar
              </Button>
            </ResponsiveDialogFooter>
          </div>
        )}

        {!loading && detail && editing && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...register("id")} />

            <div className="space-y-2">
              <Label htmlFor="edit-date">Data</Label>
              <Controller
                control={control}
                name="date"
                render={({ field }) => (
                  <DatePicker
                    id="edit-date"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.date && (
                <p className="text-sm text-destructive">
                  {errors.date.message}
                </p>
              )}
            </div>

            {!isSacerdote && (
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Observações</Label>
                <Textarea
                  id="edit-notes"
                  rows={3}
                  {...register("notes")}
                />
              </div>
            )}

            {isPreceptoria && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-purposes">Propósitos</Label>
                  <Textarea
                    id="edit-purposes"
                    rows={3}
                    {...register("purposes")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-lifePlan">Plano de vida</Label>
                  <Textarea
                    id="edit-lifePlan"
                    rows={3}
                    {...register("lifePlan")}
                  />
                </div>
              </>
            )}

            <ResponsiveDialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  if (detail) {
                    reset({
                      id: detail.id,
                      date: detail.date,
                      notes: detail.notes ?? "",
                      purposes: detail.purposes ?? "",
                      lifePlan: detail.lifePlan ?? "",
                    });
                  }
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : "Salvar"}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        )}

        <AlertDialog
          open={confirmDeleteOpen}
          onOpenChange={(open) => {
            if (!isDeleting) setConfirmDeleteOpen(open);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir atendimento?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação removerá permanentemente o registro deste atendimento.
                Não é possível desfazer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {deleteError && (
              <p className="text-sm text-destructive">{deleteError}</p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirmDelete();
                }}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
