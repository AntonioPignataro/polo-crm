"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
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
import {
  addStudyHourSchema,
  type AddStudyHourInput,
} from "@/modules/study-hours/schemas/study-hour-schema";
import { saveStudyHours } from "@/modules/study-hours/actions/save-study-hours";

interface MemberOption {
  id: string;
  fullName: string;
}

interface StudyHourFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: MemberOption[];
}

/**
 * Given any date, return the Monday of that week as YYYY-MM-DD string.
 */
function getWeekMonday(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // adjust to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function formatWeekRange(mondayStr: string): string {
  const mon = new Date(mondayStr + "T12:00:00");
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${fmt(mon)} a ${fmt(sun)}`;
}

export function StudyHourFormDialog({
  open,
  onOpenChange,
  members,
}: StudyHourFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [weekLabel, setWeekLabel] = useState<string>("");
  const [pickedDate, setPickedDate] = useState<string>("");
  const [serverError, setServerError] = useState<string>("");

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AddStudyHourInput>({
    resolver: zodResolver(addStudyHourSchema),
    defaultValues: {
      memberId: "",
      weekStart: "",
      hours: 0,
    },
  });

  function handleDateChange(raw: string) {
    setPickedDate(raw);
    if (!raw) {
      setValue("weekStart", "");
      setWeekLabel("");
      return;
    }
    const monday = getWeekMonday(raw);
    setValue("weekStart", monday);
    setWeekLabel(formatWeekRange(monday));
  }

  function onSubmit(data: AddStudyHourInput) {
    setServerError("");
    startTransition(async () => {
      const result = await saveStudyHours({
        entries: [
          {
            memberId: data.memberId,
            weekStart: data.weekStart,
            hours: data.hours,
          },
        ],
      });
      if (result.success) {
        reset();
        setWeekLabel("");
        setPickedDate("");
        onOpenChange(false);
        window.location.reload();
      } else {
        setServerError(result.error ?? "Erro ao salvar horas de estudo.");
      }
    });
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-sm">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Registrar Horas de Estudo</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Registre as horas de estudo de um sócio para uma semana.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {serverError}
            </div>
          )}
          <div className="space-y-2">
            <Label>Sócio</Label>
            <Select onValueChange={(v) => setValue("memberId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o sócio" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.memberId && (
              <p className="text-sm text-destructive">
                {errors.memberId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="weekDate">Semana</Label>
            <DatePicker
              id="weekDate"
              value={pickedDate}
              onChange={handleDateChange}
            />
            <input type="hidden" {...register("weekStart")} />
            {weekLabel && (
              <p className="text-xs text-muted-foreground">
                Semana selecionada: <span className="font-medium">{weekLabel}</span>
              </p>
            )}
            {errors.weekStart && (
              <p className="text-sm text-destructive">
                {errors.weekStart.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours">Horas</Label>
            <Input
              id="hours"
              type="number"
              step="0.5"
              min="0"
              {...register("hours", { valueAsNumber: true })}
            />
            {errors.hours && (
              <p className="text-sm text-destructive">
                {errors.hours.message}
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
