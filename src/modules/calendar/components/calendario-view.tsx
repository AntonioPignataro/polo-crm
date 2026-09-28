"use client";

import { useState, useMemo, useTransition } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
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
import { CalendarEventFormDialog } from "@/modules/calendar/components/calendar-event-form-dialog";
import { CalendarEventEditDialog } from "@/modules/calendar/components/calendar-event-edit-dialog";
import { deleteCalendarEvent } from "@/modules/calendar/actions/delete-calendar-event";
import type { CalendarEventItem } from "@/modules/calendar/queries/get-calendar-events";
import type { CalendarEventType, UserRole } from "@/types";
import { CALENDAR_EVENT_TYPE_LABELS } from "@/lib/constants";

const eventTypeConfig: Record<
  CalendarEventType,
  { label: string; dotClass: string }
> = {
  CLUBE_REGULAR: { label: CALENDAR_EVENT_TYPE_LABELS.CLUBE_REGULAR, dotClass: "bg-green-500" },
  ATIVIDADE_EXTERNA: { label: CALENDAR_EVENT_TYPE_LABELS.ATIVIDADE_EXTERNA, dotClass: "bg-blue-500" },
  FORMACAO_PAIS: { label: CALENDAR_EVENT_TYPE_LABELS.FORMACAO_PAIS, dotClass: "bg-purple-500" },
  SEM_ATIVIDADE: { label: CALENDAR_EVENT_TYPE_LABELS.SEM_ATIVIDADE, dotClass: "bg-red-500" },
  OUTROS: { label: CALENDAR_EVENT_TYPE_LABELS.OUTROS, dotClass: "bg-gray-500" },
};

function eventBadgeClass(type: CalendarEventType): string {
  switch (type) {
    case "CLUBE_REGULAR":
      return "bg-green-100 text-green-800 hover:bg-green-100";
    case "ATIVIDADE_EXTERNA":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    case "FORMACAO_PAIS":
      return "bg-purple-100 text-purple-800 hover:bg-purple-100";
    case "SEM_ATIVIDADE":
      return "bg-red-100 text-red-800 hover:bg-red-100";
    case "OUTROS":
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
  }
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEKDAY_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

interface CalendarioViewProps {
  eventsSem1: CalendarEventItem[];
  eventsSem2: CalendarEventItem[];
  year: number;
  initialMonth: number;
  userRole: UserRole;
  isParent: boolean;
}

export function CalendarioView({
  eventsSem1,
  eventsSem2,
  year,
  initialMonth,
  userRole,
  isParent,
}: CalendarioViewProps) {
  const canManageEvents =
    !isParent &&
    ["SUPER_ADMIN", "DIRETOR", "PRECEPTOR"].includes(userRole);
  const semesters = [
    { value: `${year}.1`, label: `${year}.1 (Jan - Jun)` },
    { value: `${year}.2`, label: `${year}.2 (Jul - Dez)` },
  ];

  // Open on the current month: months 0–5 → 1º semestre (index = month),
  // months 6–11 → 2º semestre (index = month − 6).
  const [semester, setSemester] = useState(
    semesters[initialMonth < 6 ? 0 : 1].value
  );
  const [currentMonthIndex, setCurrentMonthIndex] = useState(
    initialMonth < 6 ? initialMonth : initialMonth - 6
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEventItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const events = semester === semesters[0].value ? eventsSem1 : eventsSem2;

  const semesterMonths =
    semester === semesters[0].value
      ? [0, 1, 2, 3, 4, 5]
      : [6, 7, 8, 9, 10, 11];

  const month = semesterMonths[currentMonthIndex];

  const eventsMap = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();
    for (const ev of events) {
      const existing = map.get(ev.date) ?? [];
      existing.push(ev);
      map.set(ev.date, existing);
    }
    return map;
  }, [events]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const selectedEvents = selectedDate ? eventsMap.get(selectedDate) ?? [] : [];

  // Mobile agenda: days with events in current month
  const monthAgenda = useMemo(() => {
    const days: { day: number; weekday: string; events: CalendarEventItem[] }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const key = dateKey(year, month, d);
      const dayEvents = eventsMap.get(key);
      if (dayEvents && dayEvents.length > 0) {
        const weekdayIdx = new Date(year, month, d).getDay();
        days.push({ day: d, weekday: WEEKDAY_FULL[weekdayIdx], events: dayEvents });
      }
    }
    return days;
  }, [year, month, daysInMonth, eventsMap]);

  function handleDelete(eventId: string) {
    startTransition(async () => {
      const result = await deleteCalendarEvent({ eventId });
      if (result.success) {
        setDeleteConfirmId(null);
        window.location.reload();
      }
    });
  }

  function handlePrevMonth() {
    setCurrentMonthIndex((prev) => Math.max(0, prev - 1));
    setSelectedDate(null);
  }

  function handleNextMonth() {
    setCurrentMonthIndex((prev) => Math.min(5, prev + 1));
    setSelectedDate(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="hidden md:block">
          <h1 className="text-3xl font-bold tracking-tight">
            Calendário Semestral
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualize todos os eventos do semestre.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={semester}
            onValueChange={(v) => {
              setSemester(v);
              setCurrentMonthIndex(0);
              setSelectedDate(null);
            }}
          >
            <SelectTrigger className="w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {semesters.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canManageEvents && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 size-4" />
              Novo Evento
            </Button>
          )}
        </div>
      </div>

      {canManageEvents && (
        <CalendarEventFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          semester={semester}
        />
      )}

      {canManageEvents && editEvent && (
        <CalendarEventEditDialog
          open={!!editEvent}
          onOpenChange={(open) => {
            if (!open) setEditEvent(null);
          }}
          event={editEvent}
          semester={semester}
        />
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {(
          Object.entries(eventTypeConfig) as [
            CalendarEventType,
            (typeof eventTypeConfig)[CalendarEventType],
          ][]
        ).map(([type, config]) => (
          <div key={type} className="flex items-center gap-2 text-sm">
            <span className={`size-3 rounded-full ${config.dotClass}`} />
            <span>{config.label}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid — Desktop */}
      <Card className="hidden md:block">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevMonth}
              disabled={currentMonthIndex === 0}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <CardTitle className="min-w-[160px] text-center">
              {MONTH_LABELS[month]} {year}
            </CardTitle>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextMonth}
              disabled={currentMonthIndex === 5}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Weekday headers */}
          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="py-2 text-center text-xs font-medium text-muted-foreground"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (day === null) {
                return <div key={`empty-${i}`} className="min-h-[72px]" />;
              }

              const key = dateKey(year, month, day);
              const dayEvents = eventsMap.get(key) ?? [];
              const isSelected = selectedDate === key;
              const uniqueTypes = [...new Set(dayEvents.map((e) => e.type))];

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(isSelected ? null : key)}
                  className={`min-h-[72px] rounded-md border p-1 text-left transition-colors hover:bg-accent ${
                    isSelected
                      ? "border-primary bg-accent ring-1 ring-primary"
                      : "border-transparent"
                  }`}
                >
                  <span className="text-xs font-medium">{day}</span>
                  {uniqueTypes.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-0.5">
                      {uniqueTypes.map((type) => (
                        <span
                          key={type}
                          className={`block size-2 rounded-full ${eventTypeConfig[type].dotClass}`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Event list for selected date — Desktop */}
      {selectedDate && (
        <Card className="hidden md:block">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarIcon className="size-4" />
              Eventos em{" "}
              {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedEvents.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhum evento nesta data.
              </p>
            ) : (
              <ul className="space-y-3">
                {selectedEvents.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <span
                      className={`mt-1 size-3 shrink-0 rounded-full ${eventTypeConfig[ev.type].dotClass}`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{ev.title}</p>
                        <Badge className={eventBadgeClass(ev.type)}>
                          {eventTypeConfig[ev.type].label}
                        </Badge>
                      </div>
                      {ev.description && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          {ev.description}
                        </p>
                      )}
                    </div>
                    {canManageEvents && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => setEditEvent(ev)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        {deleteConfirmId === ev.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => handleDelete(ev.id)}
                              disabled={isPending}
                            >
                              {isPending ? "..." : "Confirmar"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => setDeleteConfirmId(null)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmId(ev.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mobile Agenda View */}
      <div className="space-y-4 md:hidden">
        {/* Compact month navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevMonth}
            disabled={currentMonthIndex === 0}
            className="size-10"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <span className="text-base font-semibold">
            {MONTH_LABELS[month]} {year}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            disabled={currentMonthIndex === 5}
            className="size-10"
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>

        {/* Agenda list */}
        {monthAgenda.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              <CalendarIcon className="mx-auto mb-2 size-8 opacity-40" />
              Nenhum evento neste mês.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {monthAgenda.map(({ day, weekday, events: dayEvents }) => (
              <div key={day} className="flex gap-3">
                {/* Date column */}
                <div className="flex w-14 shrink-0 flex-col items-center pt-1">
                  <span className="text-2xl font-bold leading-none">{day}</span>
                  <span className="mt-0.5 text-[11px] text-muted-foreground">
                    {weekday.slice(0, 3)}
                  </span>
                </div>
                {/* Events column */}
                <div className="flex-1 space-y-2">
                  {dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-start gap-2 rounded-lg border p-3"
                    >
                      <span
                        className={`mt-0.5 size-2.5 shrink-0 rounded-full ${eventTypeConfig[ev.type].dotClass}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">
                          {ev.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {eventTypeConfig[ev.type].label}
                        </p>
                        {ev.description && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {ev.description}
                          </p>
                        )}
                        {canManageEvents && (
                          <div className="flex items-center gap-1 mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => setEditEvent(ev)}
                            >
                              <Pencil className="mr-1 size-3" />
                              Editar
                            </Button>
                            {deleteConfirmId === ev.id ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleDelete(ev.id)}
                                  disabled={isPending}
                                >
                                  {isPending ? "..." : "Confirmar"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => setDeleteConfirmId(null)}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-destructive hover:text-destructive"
                                onClick={() => setDeleteConfirmId(ev.id)}
                              >
                                <Trash2 className="mr-1 size-3" />
                                Excluir
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
