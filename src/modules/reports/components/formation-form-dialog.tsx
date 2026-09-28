"use client";

import { useTransition } from "react";
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
  createFormationSchema,
  formationTypeValues,
  type CreateFormationInput,
} from "@/modules/reports/schemas/formation-schema";
import { createFormation } from "@/modules/reports/actions/create-formation";
import { FORMATION_TYPE_LABELS } from "@/lib/constants";

interface FormationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FormationFormDialog({
  open,
  onOpenChange,
}: FormationFormDialogProps) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateFormationInput>({
    resolver: zodResolver(createFormationSchema),
    defaultValues: {
      name: "",
      type: undefined,
      date: "",
      description: "",
    },
  });

  function onSubmit(data: CreateFormationInput) {
    startTransition(async () => {
      const result = await createFormation(data);
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
          <ResponsiveDialogTitle>Nova Formação</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Cadastre uma nova formação para pais.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="formation-name">Nome</Label>
            <Input
              id="formation-name"
              placeholder="Nome da formação"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              onValueChange={(v) =>
                setValue("type", v as CreateFormationInput["type"])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {formationTypeValues.map((value) => (
                  <SelectItem key={value} value={value}>
                    {FORMATION_TYPE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-destructive">{errors.type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="formation-date">Data</Label>
            <Controller
              control={control}
              name="date"
              render={({ field }) => (
                <DatePicker
                  id="formation-date"
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
            <Label htmlFor="formation-description">Descrição</Label>
            <Textarea
              id="formation-description"
              placeholder="Descrição da formação (opcional)"
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
