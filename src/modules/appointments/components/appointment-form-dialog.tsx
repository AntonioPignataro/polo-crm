"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import {
  createAppointmentSchema,
  type CreateAppointmentInput,
} from "@/modules/appointments/schemas/appointment-schema";
import { createAppointment } from "@/modules/appointments/actions/create-appointment";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/constants";
import type { AppointmentType } from "@/types";

interface MemberOption {
  id: string;
  fullName: string;
}

interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allMembers: MemberOption[];
  assignedMembers: MemberOption[];
  userRole: string;
}

export function AppointmentFormDialog({
  open,
  onOpenChange,
  allMembers,
  assignedMembers,
  userRole,
}: AppointmentFormDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedType, setSelectedType] = useState<string>("");
  const [serverError, setServerError] = useState<string | null>(null);

  // Determine which type options to show based on role
  const allowedTypeEntries = (
    Object.entries(APPOINTMENT_TYPE_LABELS) as [AppointmentType, string][]
  ).filter(([value]) => {
    if (userRole === "MONITOR") return value === "SACERDOTE";
    return true;
  });

  // Determine which members to show based on selected type + role
  const isPreceptoriaType =
    selectedType === "PRECEPTORIA_SOCIO" || selectedType === "PRECEPTORIA_PAIS";
  const visibleMembers =
    isPreceptoriaType && userRole === "PRECEPTOR"
      ? assignedMembers
      : allMembers;

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateAppointmentInput>({
    resolver: zodResolver(createAppointmentSchema),
    defaultValues: {
      memberId: "",
      date: new Date().toISOString().split("T")[0],
      type: undefined,
      notes: "",
      purposes: "",
      lifePlan: "",
    },
  });

  function onSubmit(data: CreateAppointmentInput) {
    setServerError(null);
    startTransition(async () => {
      try {
        const result = await createAppointment(data);
        if (result.success) {
          reset();
          setSelectedType("");
          onOpenChange(false);
          router.refresh();
        } else {
          setServerError(result.error ?? "Erro ao criar atendimento.");
        }
      } catch (err) {
        setServerError(
          err instanceof Error ? err.message : "Erro inesperado. Tente novamente."
        );
      }
    });
  }

  const isSacerdote = selectedType === "SACERDOTE";

  return (
    <ResponsiveDialog open={open} onOpenChange={(v) => {
      if (!v) {
        setServerError(null);
        reset();
        setSelectedType("");
      }
      onOpenChange(v);
    }}>
      <ResponsiveDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Novo Atendimento</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Registre um novo atendimento para um sócio.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              onValueChange={(v) => {
                setSelectedType(v);
                setValue("type", v as CreateAppointmentInput["type"]);
                // Reset member selection when type changes (member list may differ)
                setValue("memberId", "");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {allowedTypeEntries.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-destructive">{errors.type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Sócio</Label>
            <Select
              onValueChange={(v) => setValue("memberId", v)}
              disabled={!selectedType}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    selectedType
                      ? "Selecione o sócio"
                      : "Selecione o tipo primeiro"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {visibleMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.memberId && (
              <p className="text-sm text-destructive">{errors.memberId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Controller
              control={control}
              name="date"
              render={({ field }) => (
                <DatePicker
                  id="date"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date.message}</p>
            )}
          </div>

          {!isSacerdote && (
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Observações opcionais..."
                {...register("notes")}
              />
            </div>
          )}

          {isPreceptoriaType && (
            <>
              <div className="space-y-2">
                <Label htmlFor="purposes">Propósitos</Label>
                <Textarea
                  id="purposes"
                  placeholder="Propósitos..."
                  {...register("purposes")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lifePlan">Plano de vida</Label>
                <Textarea
                  id="lifePlan"
                  placeholder="Plano de vida..."
                  {...register("lifePlan")}
                />
              </div>
            </>
          )}

          {serverError && (
            <p className="text-sm text-destructive rounded-md bg-destructive/10 p-3">
              {serverError}
            </p>
          )}

          {Object.keys(errors).length > 0 && (
            <p className="text-sm text-destructive rounded-md bg-destructive/10 p-3">
              Preencha todos os campos obrigatórios.
            </p>
          )}

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
