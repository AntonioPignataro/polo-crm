"use client";

import { useEffect, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formationTypeValues,
  updateFormationSchema,
  type UpdateFormationInput,
} from "@/modules/reports/schemas/formation-schema";
import { updateFormation } from "@/modules/reports/actions/update-formation";
import { deleteFormation } from "@/modules/reports/actions/delete-formation";
import { FORMATION_TYPE_LABELS } from "@/lib/constants";
import type { FormationItem } from "@/modules/reports/queries/get-formations";

interface FormationEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formation: FormationItem | null;
}

export function FormationEditDialog({
  open,
  onOpenChange,
  formation,
}: FormationEditDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string>("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<UpdateFormationInput>({
    resolver: zodResolver(updateFormationSchema),
    defaultValues: {
      id: "",
      name: "",
      type: "FORMACAO_PAI",
      date: "",
      description: "",
    },
  });

  const typeValue = watch("type");

  useEffect(() => {
    if (!formation) return;
    reset({
      id: formation.id,
      name: formation.nome,
      type: formation.tipo,
      date: formation.data,
      description: formation.descricao ?? "",
    });
    setServerError("");
  }, [formation, reset]);

  function onSubmit(data: UpdateFormationInput) {
    setServerError("");
    startTransition(async () => {
      const result = await updateFormation(data);
      if (result.success) {
        onOpenChange(false);
        window.location.reload();
      } else {
        setServerError(result.error);
      }
    });
  }

  function handleConfirmDelete() {
    if (!formation) return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteFormation(formation.id);
      if (result.success) {
        setConfirmDeleteOpen(false);
        onOpenChange(false);
        window.location.reload();
      } else {
        setDeleteError(result.error);
      }
    });
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Editar Formação</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Altere os dados da formação para pais.
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
            <Label htmlFor="edit-formation-name">Nome</Label>
            <Input
              id="edit-formation-name"
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
              value={typeValue}
              onValueChange={(v) =>
                setValue("type", v as UpdateFormationInput["type"])
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
            <Label htmlFor="edit-formation-date">Data</Label>
            <Controller
              control={control}
              name="date"
              render={({ field }) => (
                <DatePicker
                  id="edit-formation-date"
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
            <Label htmlFor="edit-formation-description">Descrição</Label>
            <Textarea
              id="edit-formation-description"
              placeholder="Descrição da formação (opcional)"
              {...register("description")}
            />
          </div>

          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive sm:mr-auto"
              onClick={() => {
                setDeleteError(null);
                setConfirmDeleteOpen(true);
              }}
            >
              <Trash2 className="mr-1 size-4" />
              Excluir
            </Button>
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

        <AlertDialog
          open={confirmDeleteOpen}
          onOpenChange={(open) => {
            if (!isDeleting) setConfirmDeleteOpen(open);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir formação?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação removerá permanentemente esta formação
                {formation && formation.participantes.length > 0 ? (
                  <>
                    {" "}
                    e <strong>{formation.participantes.length}</strong> registro
                    {formation.participantes.length === 1 ? "" : "s"} de
                    presença/RSVP associado
                    {formation.participantes.length === 1 ? "" : "s"}
                  </>
                ) : null}
                . Não é possível desfazer.
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
