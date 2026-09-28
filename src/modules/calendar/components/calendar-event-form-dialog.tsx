"use client";

import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  createCalendarEventSchema,
  calendarEventTypeValues,
  type CreateCalendarEventInput,
} from "@/modules/calendar/schemas/calendar-event-schema";
import { createCalendarEvent } from "@/modules/calendar/actions/create-calendar-event";

import { CALENDAR_EVENT_TYPE_LABELS } from "@/lib/constants";

interface CalendarEventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  semester: string;
}

export function CalendarEventFormDialog({
  open,
  onOpenChange,
  semester,
}: CalendarEventFormDialogProps) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateCalendarEventInput>({
    resolver: zodResolver(createCalendarEventSchema),
    defaultValues: {
      semester,
      title: "",
      date: "",
      eventType: undefined,
      description: "",
    },
  });

  function onSubmit(data: CreateCalendarEventInput) {
    startTransition(async () => {
      const result = await createCalendarEvent(data);
      if (result.success) {
        reset();
        onOpenChange(false);
        window.location.reload();
      }
    });
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Novo Evento</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Adicione um evento ao calendário semestral.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("semester")} />

          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              placeholder="Título do evento"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select onValueChange={(v) => setValue("eventType", v as CreateCalendarEventInput["eventType"])}>
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
              <p className="text-sm text-destructive">{errors.eventType.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-date">Data</Label>
            <Controller
              control={control}
              name="date"
              render={({ field }) => (
                <DatePicker
                  id="event-date"
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
            <Label htmlFor="event-description">Descrição</Label>
            <Textarea
              id="event-description"
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
