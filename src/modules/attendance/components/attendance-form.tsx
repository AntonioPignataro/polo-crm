"use client";

import { useState, useMemo, useTransition, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ClipboardCheck, Plus, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AttendanceMember } from "../queries/get-members-for-attendance";
import type { AttendanceSessionData } from "../queries/get-attendance-session";
import { getMembersForAttendance } from "../queries/get-members-for-attendance";
import { getAttendanceSession } from "../queries/get-attendance-session";
import { saveAttendance } from "../actions/save-attendance";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DayType = "QUINTA" | "SEXTA" | "SABADO";

interface MemberRecord {
  memberId: string;
  present: boolean;
  onTime: boolean;
}

interface AttendanceFormProps {
  initialMembers: AttendanceMember[];
  initialDayType: DayType;
  initialSession?: AttendanceSessionData | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AttendanceForm({
  initialMembers,
  initialDayType,
  initialSession,
}: AttendanceFormProps) {
  const today = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState(today);
  const [dayType, setDayType] = useState<DayType>(initialDayType);
  const [members, setMembers] = useState<AttendanceMember[]>(initialMembers);
  const [records, setRecords] = useState<Map<string, MemberRecord>>(() =>
    buildRecordsMap(initialMembers, initialSession)
  );
  const isMobile = useIsMobile();
  const [isFetching, startFetchTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Build the records map from members and optional existing session
  function buildRecordsMap(
    membersList: AttendanceMember[],
    sessionData?: AttendanceSessionData | null
  ): Map<string, MemberRecord> {
    const map = new Map<string, MemberRecord>();
    const sessionRecords = new Map<string, { present: boolean; onTime: boolean }>();

    if (sessionData) {
      for (const r of sessionData.records) {
        sessionRecords.set(r.memberId, {
          present: r.present,
          onTime: r.onTime,
        });
      }
    }

    for (const m of membersList) {
      const existing = sessionRecords.get(m.id);
      map.set(m.id, {
        memberId: m.id,
        present: existing?.present ?? false,
        onTime: existing?.onTime ?? false,
      });
    }

    return map;
  }

  // Summary calculation
  const summary = useMemo(() => {
    const total = members.length;
    let presentes = 0;
    for (const r of records.values()) {
      if (r.present) presentes++;
    }
    const percentual = total > 0 ? Math.round((presentes / total) * 100) : 0;
    return { presentes, total, percentual };
  }, [members.length, records]);

  // Refetch members and session when dayType or date changes
  const refetchData = useCallback(
    (newDate: string, newDayType: DayType) => {
      startFetchTransition(async () => {
        setSaveMessage(null);
        const [newMembers, newSession] = await Promise.all([
          getMembersForAttendance(newDayType),
          getAttendanceSession({ date: newDate, dayType: newDayType }),
        ]);
        setMembers(newMembers);
        setRecords(buildRecordsMap(newMembers, newSession));
      });
    },
    []
  );

  function handleDateChange(newDate: string) {
    setDate(newDate);
    refetchData(newDate, dayType);
  }

  function handleDayTypeChange(newDayType: DayType) {
    setDayType(newDayType);
    refetchData(date, newDayType);
  }

  function togglePresent(memberId: string) {
    setRecords((prev) => {
      const next = new Map(prev);
      const current = next.get(memberId);
      if (!current) return prev;
      const newPresent = !current.present;
      next.set(memberId, {
        ...current,
        present: newPresent,
        onTime: newPresent ? current.onTime : false,
      });
      return next;
    });
  }

  function toggleOnTime(memberId: string) {
    setRecords((prev) => {
      const next = new Map(prev);
      const current = next.get(memberId);
      if (!current || !current.present) return prev;
      next.set(memberId, {
        ...current,
        onTime: !current.onTime,
      });
      return next;
    });
  }

  function handleSave() {
    startSaveTransition(async () => {
      setSaveMessage(null);

      const recordsArray = Array.from(records.values()).map((r) => ({
        memberId: r.memberId,
        present: r.present,
        onTime: r.onTime,
      }));

      const result = await saveAttendance({
        date,
        dayType,
        records: recordsArray,
      });

      if (result.success) {
        setSaveMessage({
          type: "success",
          text: `Presença salva! ${result.data.presentCount}/${result.data.totalCount} presentes.`,
        });
      } else {
        setSaveMessage({
          type: "error",
          text: result.error,
        });
      }
    });
  }

  function handleNovaSessao() {
    const newDate = new Date().toISOString().split("T")[0];
    setDate(newDate);
    setSaveMessage(null);
    refetchData(newDate, dayType);
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="hidden md:block">
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <ClipboardCheck className="size-7 text-green-600" />
            Presença
          </h1>
          <p className="text-muted-foreground mt-1">
            Registre a presença e pontualidade dos sócios.
          </p>
        </div>
        <Button variant="outline" onClick={handleNovaSessao} disabled={isFetching} className="w-full sm:w-auto">
          <Plus />
          Nova Sessão
        </Button>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração da Sessão</CardTitle>
          <CardDescription>
            Selecione a data e o tipo de dia para o registro de presença.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="data-sessao">Data</Label>
              <DatePicker
                id="data-sessao"
                value={date}
                onChange={handleDateChange}
                disabled={isFetching}
                className="w-[180px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Módulo</Label>
              <Select
                value={dayType}
                onValueChange={(v) => handleDayTypeChange(v as DayType)}
                disabled={isFetching}
              >
                <SelectTrigger className="w-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QUINTA">Quinta-feira</SelectItem>
                  <SelectItem value="SEXTA">Sexta-feira</SelectItem>
                  <SelectItem value="SABADO">Sábado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isFetching && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="size-4 animate-spin" />
                Carregando...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Presença</CardTitle>
          <CardDescription>
            Marque os sócios que estão presentes e pontuais.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {members.length === 0 ? (
            <p className="text-muted-foreground h-24 text-center flex items-center justify-center">
              Nenhum sócio encontrado para este módulo.
            </p>
          ) : isMobile ? (
            /* Mobile: Checklist Cards */
            <div className="space-y-2">
              {members.map((member) => {
                const record = records.get(member.id);
                const isPresent = record?.present ?? false;
                const isOnTime = record?.onTime ?? false;

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{member.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {String(member.code).padStart(3, "0")} · {member.groupType}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-md text-xs hover:bg-muted/50">
                        <Checkbox
                          checked={isPresent}
                          onCheckedChange={() => togglePresent(member.id)}
                          disabled={isFetching}
                        />
                        P
                      </label>
                      <label className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-md text-xs hover:bg-muted/50">
                        <Checkbox
                          checked={isOnTime}
                          disabled={!isPresent || isFetching}
                          onCheckedChange={() => toggleOnTime(member.id)}
                        />
                        T
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Desktop: Table */
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Cod</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead className="w-[100px] text-center">
                      Presente
                    </TableHead>
                    <TableHead className="w-[100px] text-center">
                      Pontual
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => {
                    const record = records.get(member.id);
                    const isPresent = record?.present ?? false;
                    const isOnTime = record?.onTime ?? false;

                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {String(member.code).padStart(3, "0")}
                        </TableCell>
                        <TableCell>{member.fullName}</TableCell>
                        <TableCell>{member.groupType}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={isPresent}
                              onCheckedChange={() => togglePresent(member.id)}
                              disabled={isFetching}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={isOnTime}
                              disabled={!isPresent || isFetching}
                              onCheckedChange={() => toggleOnTime(member.id)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Summary Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border bg-muted/50 px-4 py-3">
            <div className="text-sm">
              <span className="font-semibold">
                {summary.presentes}/{summary.total}
              </span>{" "}
              presentes{" "}
              <span
                className={`ml-2 font-bold ${
                  summary.percentual >= 80
                    ? "text-green-600"
                    : summary.percentual >= 50
                      ? "text-yellow-600"
                      : "text-red-600"
                }`}
              >
                ({summary.percentual}%)
              </span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              {saveMessage && (
                <span
                  className={`text-sm font-medium ${
                    saveMessage.type === "success"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {saveMessage.text}
                </span>
              )}
              <Button
                onClick={handleSave}
                disabled={isSaving || isFetching || members.length === 0}
                className="w-full sm:w-auto"
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save />
                )}
                {isSaving ? "Salvando..." : "Salvar Presença"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
