"use client";

import { useEffect, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACTIVITY_STATUS_LABELS } from "@/lib/constants";
import {
  activityStatusValues,
  updateActivitySchema,
  type UpdateActivityInput,
} from "@/modules/activities/schemas/activity-schema";
import { updateActivity } from "@/modules/activities/actions/update-activity";
import type { ActivityItem } from "@/modules/activities/queries/get-activities";

interface ActivityEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: ActivityItem | null;
}

export function ActivityEditDialog({
  open,
  onOpenChange,
  activity,
}: ActivityEditDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string>("");

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<UpdateActivityInput>({
    resolver: zodResolver(updateActivitySchema),
    defaultValues: {
      id: "",
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      costPerPerson: 0,
      status: "PLANEJADA",
    },
  });

  // Re-populate the form whenever a different activity is selected.
  useEffect(() => {
    if (!activity) return;
    reset({
      id: activity.id,
      name: activity.name,
      description: activity.description ?? "",
      startDate: activity.startDate ?? "",
      endDate: activity.endDate ?? "",
      costPerPerson: activity.custoSocio ?? 0,
      status: activity.status,
    });
    setServerError("");
  }, [activity, reset]);

  function onSubmit(data: UpdateActivityInput) {
    setServerError("");
    startTransition(async () => {
      const result = await updateActivity(data);
      if (result.success) {
        onOpenChange(false);
        window.location.reload();
      } else {
        setServerError(result.error);
      }
    });
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Editar Atividade</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Altere os dados da atividade.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("id")} />

          {serverError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {serverError}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome</Label>
            <Input
              id="edit-name"
              placeholder="Nome da atividade"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Descrição</Label>
            <Textarea
              id="edit-description"
              placeholder="Descrição da atividade..."
              {...register("description")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-startDate">Data Início</Label>
              <Controller
                control={control}
                name="startDate"
                render={({ field }) => (
                  <DatePicker
                    id="edit-startDate"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.startDate && (
                <p className="text-sm text-destructive">
                  {errors.startDate.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-endDate">Data Fim</Label>
              <Controller
                control={control}
                name="endDate"
                render={({ field }) => (
                  <DatePicker
                    id="edit-endDate"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-costPerPerson">Custo por Sócio (R$)</Label>
            <Input
              id="edit-costPerPerson"
              type="number"
              step="0.01"
              min="0"
              {...register("costPerPerson", { valueAsNumber: true })}
            />
            {errors.costPerPerson && (
              <p className="text-sm text-destructive">
                {errors.costPerPerson.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {activityStatusValues.map((s) => (
                      <SelectItem key={s} value={s}>
                        {ACTIVITY_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.status && (
              <p className="text-sm text-destructive">
                {errors.status.message}
              </p>
            )}
          </div>

          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
