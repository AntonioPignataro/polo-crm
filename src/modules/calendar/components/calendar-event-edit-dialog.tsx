"use client";

import { useTransition, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
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
import { calendarEventTypeValues } from "@/modules/calendar/schemas/calendar-event-schema";
import { updateCalendarEvent } from "@/modules/calendar/actions/update-calendar-event";
import { CALENDAR_EVENT_TYPE_LABELS } from "@/lib/constants";
import type { CalendarEventItem } from "@/modules/calendar/queries/get-calendar-events";

const editSchema = z.object({
  title: z.string().min(1, { message: "Título é obrigatório." }),
  date: z.string().min(1, { message: "Data é obrigatória." }),
  eventType: z.enum(calendarEventTypeValues, {
    message: "Tipo de evento inválido.",
  }),
  description: z.string().optional(),
});

type EditFormData = z.infer<typeof editSchema>;

interface CalendarEventEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEventItem;
  semester: string;
}

export function CalendarEventEditDialog({
  open,
  onOpenChange,
  event,
  semester,
}: CalendarEventEditDialogProps) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: event.title,
      date: event.date,
      eventType: event.type as EditFormData["eventType"],
      description: event.description ?? "",
    },
  });

  // Reset form when event changes
  useEffect(() => {
    reset({
      title: event.title,
      date: event.date,
      eventType: event.type as EditFormData["eventType"],
      description: event.description ?? "",
    });
  }, [event, reset]);

  function onSubmit(data: EditFormData) {
    startTransition(async () => {
      const result = await updateCalendarEvent({
        eventId: event.id,
        title: data.title,
        date: data.date,
        eventType: data.eventType,
        description: data.description,
      });
      if (result.success) {
        onOpenChange(false);
        window.location.reload();
      }
    });
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Editar Evento</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Atualize os dados do evento do calendário.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Título</Label>
            <Input
              id="edit-title"
              placeholder="Título do evento"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              defaultValue={event.type}
              onValueChange={(v) =>
                setValue("eventType", v as EditFormData["eventType"])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {calendarEventTypeValues.map((value) => (
                  <SelectItem key={value} value={value}>
                    {CALENDAR_EVENT_TYPE_LABELS[value as keyof typeof CALENDAR_EVENT_TYPE_LABELS]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.eventType && (
              <p className="text-sm text-destructive">
                {errors.eventType.message}
              </p>
            )}
          </div>

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
              <p className="text-sm text-destructive">{errors.date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Descrição</Label>
            <Textarea
              id="edit-description"
              placeholder="Descrição opcional..."
              {...register("description")}
            />
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
