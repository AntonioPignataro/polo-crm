"use client";

import { useState } from "react";
import {
  MessageSquare,
  Plus,
  Filter,
  FileText,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/constants";
import { AppointmentFormDialog } from "@/modules/appointments/components/appointment-form-dialog";
import { AppointmentDetailDialog } from "@/modules/appointments/components/appointment-detail-dialog";
import type { AppointmentItem } from "@/modules/appointments/queries/get-appointments";
import type { AppointmentType } from "@/types";

export interface MemberOption {
  id: string;
  fullName: string;
}

function tipoBadgeClass(tipo: AppointmentType): string {
  switch (tipo) {
    case "SACERDOTE":
      return "bg-purple-100 text-purple-800 hover:bg-purple-100";
    case "PRECEPTORIA_SOCIO":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    case "PRECEPTORIA_PAIS":
      return "bg-teal-100 text-teal-800 hover:bg-teal-100";
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR");
}

interface AtendimentosViewProps {
  appointments: AppointmentItem[];
  allMembers: MemberOption[];
  assignedMembers: MemberOption[];
  userRole: string;
  currentUserId: string;
}

export function AtendimentosView({
  appointments,
  allMembers,
  assignedMembers,
  userRole,
  currentUserId,
}: AtendimentosViewProps) {
  const [filterTipo, setFilterTipo] = useState<string>("Todos");
  const [filterMember, setFilterMember] = useState<string>("Todos");
  const [filterPreceptor, setFilterPreceptor] = useState<string>("Todos");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  // Filter the type options visible in the dropdown based on role
  const allowedTypeEntries = (
    Object.entries(APPOINTMENT_TYPE_LABELS) as [AppointmentType, string][]
  ).filter(([value]) => {
    if (userRole === "MONITOR") return value === "SACERDOTE";
    return true;
  });

  const memberOptions = Array.from(
    new Set(appointments.map((a) => a.socio))
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const preceptorOptions = Array.from(
    new Set(
      appointments
        .map((a) => a.preceptor)
        .filter((p): p is string => p !== null)
    )
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const filteredAtendimentos = appointments.filter(
    (a) =>
      (filterTipo === "Todos" || a.tipo === filterTipo) &&
      (filterMember === "Todos" || a.socio === filterMember) &&
      (filterPreceptor === "Todos" || a.preceptor === filterPreceptor)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="hidden md:block">
          <h1 className="text-3xl font-bold tracking-tight">Atendimentos</h1>
          <p className="text-muted-foreground mt-1">
            Registre e acompanhe os atendimentos realizados.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 size-4" />
          Novo Atendimento
        </Button>
      </div>

      <AppointmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        allMembers={allMembers}
        assignedMembers={assignedMembers}
        userRole={userRole}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="text-muted-foreground size-4" />
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-auto min-w-36">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos os tipos</SelectItem>
            {allowedTypeEntries.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterMember} onValueChange={setFilterMember}>
          <SelectTrigger className="w-auto min-w-36">
            <SelectValue placeholder="Garoto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos os garotos</SelectItem>
            {memberOptions.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {preceptorOptions.length > 0 && (
          <Select value={filterPreceptor} onValueChange={setFilterPreceptor}>
            <SelectTrigger className="w-auto min-w-36">
              <SelectValue placeholder="Preceptor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os preceptores</SelectItem>
              {preceptorOptions.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Atendimentos Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="size-5" />
            Histórico de Atendimentos
          </CardTitle>
          <CardDescription>
            {filteredAtendimentos.length} atendimento(s) encontrado(s).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop: Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Sócio</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Realizado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAtendimentos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhum atendimento encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAtendimentos.map((a) => (
                    <TableRow
                      key={a.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedAppointmentId(a.id)}
                    >
                      <TableCell>{formatDate(a.date)}</TableCell>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-1.5">
                          {a.socio}
                          {a.hasContent && (
                            <FileText className="size-3.5 text-blue-500" />
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={tipoBadgeClass(a.tipo)}>
                          {APPOINTMENT_TYPE_LABELS[a.tipo]}
                        </Badge>
                      </TableCell>
                      <TableCell>{a.realizadoPor}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: Cards */}
          <div className="space-y-3 md:hidden">
            {filteredAtendimentos.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                Nenhum atendimento encontrado.
              </p>
            ) : (
              filteredAtendimentos.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border p-4 space-y-2 cursor-pointer hover:bg-muted/50 active:bg-muted/70 transition-colors"
                  onClick={() => setSelectedAppointmentId(a.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm flex items-center gap-1.5">
                      {a.socio}
                      {a.hasContent && (
                        <FileText className="size-3.5 text-blue-500" />
                      )}
                    </span>
                    <Badge className={tipoBadgeClass(a.tipo)}>
                      {APPOINTMENT_TYPE_LABELS[a.tipo]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(a.date)} · por {a.realizadoPor}
                  </p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <AppointmentDetailDialog
        appointmentId={selectedAppointmentId}
        onClose={() => setSelectedAppointmentId(null)}
        currentUserId={currentUserId}
        currentUserRole={userRole}
      />
    </div>
  );
}
