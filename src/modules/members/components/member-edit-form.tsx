"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  CheckCircle2,
  ArrowLeft,
  UserPen,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { saveMemberEdit } from "@/modules/members/actions/save-member-edit";
import {
  memberEditSchema,
  type MemberEditData,
} from "@/modules/members/schemas/member-edit-schema";
import type { MemberEditPageData } from "@/modules/members/queries/get-member-edit-data";
import { GROUP_LABELS, MODULE_LABELS } from "@/lib/constants";
import type { GroupType, ModuleType } from "@/types";

interface MemberEditFormProps {
  member: MemberEditPageData;
}

export function MemberEditForm({ member }: MemberEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [showG3Dialog, setShowG3Dialog] = useState(false);
  const [pendingG3Value, setPendingG3Value] = useState<string | null>(null);
  const [, setPolaresUntilEndOfYear] = useState(false);

  // Existing enrollment-form JSON is only used to pre-fill member core fields;
  // parents/guardians come from the live DB records (source of truth for save).
  const existingData = member.enrollmentFormUrl
    ? tryParseJSON(member.enrollmentFormUrl)
    : null;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<MemberEditData>({
    resolver: zodResolver(memberEditSchema),
    defaultValues: {
      memberName: existingData?.memberName ?? member.fullName,
      birthDate: existingData?.birthDate ?? member.birthDate,
      address: existingData?.address ?? member.address,
      groupType: existingData?.groupType ?? member.groupType,
      module: existingData?.module ?? member.moduleLabel ?? "",
      modules: existingData?.modules ?? member.moduleTypes,
      polaresUntil: existingData?.polaresUntil ?? null,
      father: {
        id: member.father?.id,
        fullName: member.father?.fullName ?? "",
        cpf: member.father?.cpf ?? "",
        phone: member.father?.phone ?? "",
        email: member.father?.email ?? "",
        profession: member.father?.profession ?? "",
      },
      mother: {
        id: member.mother?.id,
        fullName: member.mother?.fullName ?? "",
        cpf: member.mother?.cpf ?? "",
        phone: member.mother?.phone ?? "",
        email: member.mother?.email ?? "",
        profession: member.mother?.profession ?? "",
      },
      guardians: member.guardians.map((g) => ({
        id: g.id,
        fullName: g.fullName,
        cpf: g.cpf,
        phone: g.phone,
        email: g.email,
        profession: g.profession,
        sex: g.sex === "FEMININO" ? "FEMININO" : "MASCULINO",
      })),
    },
  });

  const {
    fields: guardianFields,
    append: appendGuardian,
    remove: removeGuardian,
  } = useFieldArray({ control, name: "guardians", keyName: "_key" });

  function onSubmit(data: MemberEditData) {
    startTransition(async () => {
      const result = await saveMemberEdit(member.id, data);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Editar Sócio</h1>
            <p className="text-muted-foreground text-sm">
              {member.fullName} — Código {String(member.code).padStart(3, "0")}
            </p>
          </div>
        </div>
        <UserPen className="size-8 text-blue-600" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: Member Data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Dados do Sócio</CardTitle>
            <CardDescription>
              {member.clubName} — {member.groupLabel} — Módulo{" "}
              {member.moduleLabel}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input {...register("memberName")} />
                {errors.memberName && (
                  <p className="text-sm text-destructive">
                    {errors.memberName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Data de Nascimento</Label>
                <Controller
                  control={control}
                  name="birthDate"
                  render={({ field }) => (
                    <DatePicker value={field.value} onChange={field.onChange} />
                  )}
                />
                {errors.birthDate && (
                  <p className="text-sm text-destructive">
                    {errors.birthDate.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input {...register("address")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Grupo</Label>
                <Select
                  defaultValue={existingData?.groupType ?? member.groupType}
                  onValueChange={(v) => {
                    const currentGroup = watch("groupType");
                    if (v === "G3" && currentGroup !== "G3") {
                      setPendingG3Value(v);
                      setShowG3Dialog(true);
                    } else {
                      setValue("groupType", v);
                      setPolaresUntilEndOfYear(false);
                      setValue("polaresUntil", null);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(GROUP_LABELS) as [GroupType, string][]).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Módulo</Label>
                <ModuleCheckboxes
                  defaultValues={existingData?.modules ?? member.moduleTypes}
                  onChange={(selected) => {
                    setValue("modules", selected);
                    setValue(
                      "module",
                      selected
                        .map((m) => MODULE_LABELS[m as ModuleType] ?? m)
                        .join(", ")
                    );
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Father */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Dados do Pai</CardTitle>
            <CardDescription>
              Deixe o nome em branco se o sócio não tem pai cadastrado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input type="hidden" {...register("father.id")} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input {...register("father.fullName")} />
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input
                  {...register("father.cpf")}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Celular</Label>
                <Input
                  {...register("father.phone")}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input {...register("father.email")} type="email" />
              </div>
              <div className="space-y-2">
                <Label>Profissão</Label>
                <Input {...register("father.profession")} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Mother */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Dados da Mãe</CardTitle>
            <CardDescription>
              Deixe o nome em branco se o sócio não tem mãe cadastrada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input type="hidden" {...register("mother.id")} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input {...register("mother.fullName")} />
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input
                  {...register("mother.cpf")}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Celular</Label>
                <Input
                  {...register("mother.phone")}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input {...register("mother.email")} type="email" />
              </div>
              <div className="space-y-2">
                <Label>Profissão</Label>
                <Input {...register("mother.profession")} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Additional guardians */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">
                  4. Responsáveis Adicionais
                </CardTitle>
                <CardDescription>
                  Um responsável masculino funciona como pai; feminino, como mãe.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendGuardian({
                    fullName: "",
                    email: "",
                    phone: "",
                    cpf: "",
                    profession: "",
                    sex: "MASCULINO",
                  })
                }
              >
                <Plus className="mr-1 size-4" />
                Adicionar Responsável
              </Button>
            </div>
          </CardHeader>
          {guardianFields.length > 0 && (
            <CardContent className="space-y-6">
              {guardianFields.map((field, index) => (
                <div
                  key={field._key}
                  className="relative space-y-4 rounded-lg border p-4"
                >
                  <input
                    type="hidden"
                    {...register(`guardians.${index}.id`)}
                  />
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">
                      Responsável {index + 1}
                    </h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => removeGuardian(index)}
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Remover</span>
                    </Button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Sexo *</Label>
                      <Select
                        defaultValue={field.sex}
                        onValueChange={(v) =>
                          setValue(
                            `guardians.${index}.sex`,
                            v as "MASCULINO" | "FEMININO"
                          )
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione o sexo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MASCULINO">Masculino</SelectItem>
                          <SelectItem value="FEMININO">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.guardians?.[index]?.sex && (
                        <p className="text-sm text-destructive">
                          {errors.guardians[index]?.sex?.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Nome Completo *</Label>
                      <Input
                        placeholder="Nome do responsável"
                        {...register(`guardians.${index}.fullName`)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>E-mail *</Label>
                      <Input
                        type="email"
                        placeholder="email@exemplo.com"
                        {...register(`guardians.${index}.email`)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Celular</Label>
                      <Input
                        placeholder="(00) 00000-0000"
                        {...register(`guardians.${index}.phone`)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CPF</Label>
                      <Input
                        placeholder="000.000.000-00"
                        {...register(`guardians.${index}.cpf`)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Profissão</Label>
                      <Input
                        placeholder="Profissão"
                        {...register(`guardians.${index}.profession`)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-between rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Edição de dados do sócio e responsáveis.
          </p>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-1 size-4" />
            )}
            {isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>

        {saved && (
          <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-800">
            <CheckCircle2 className="size-4" />
            Dados do sócio salvos com sucesso!
          </div>
        )}

        <AlertDialog open={showG3Dialog} onOpenChange={setShowG3Dialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Manter participação nos polares?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Sócios do G3 normalmente não participam do sistema de polares.
                Deseja que este sócio continue participando da contagem de
                polares até o final do ano ({new Date().getFullYear()})?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  if (pendingG3Value) {
                    setValue("groupType", pendingG3Value);
                    setValue("polaresUntil", null);
                    setPolaresUntilEndOfYear(false);
                  }
                  setPendingG3Value(null);
                }}
              >
                Não
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (pendingG3Value) {
                    setValue("groupType", pendingG3Value);
                    const endOfYear = `${new Date().getFullYear()}-12-31`;
                    setValue("polaresUntil", endOfYear);
                    setPolaresUntilEndOfYear(true);
                  }
                  setPendingG3Value(null);
                }}
              >
                Sim, manter até o final do ano
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </form>
    </div>
  );
}

function tryParseJSON(
  str: string
): (MemberEditData & Record<string, unknown>) | null {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function ModuleCheckboxes({
  defaultValues,
  onChange,
}: {
  defaultValues: string[];
  onChange: (selected: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(defaultValues);

  function toggle(moduleType: string) {
    const next = selected.includes(moduleType)
      ? selected.filter((m) => m !== moduleType)
      : [...selected, moduleType];
    if (next.length === 0) return;
    setSelected(next);
    onChange(next);
  }

  return (
    <div className="flex flex-wrap gap-3 pt-1">
      {(Object.entries(MODULE_LABELS) as [ModuleType, string][]).map(
        ([value, label]) => (
          <div key={value} className="flex items-center gap-2">
            <Checkbox
              id={`module-edit-${value}`}
              checked={selected.includes(value)}
              onCheckedChange={() => toggle(value)}
            />
            <Label
              htmlFor={`module-edit-${value}`}
              className="cursor-pointer text-sm"
            >
              {label}
            </Label>
          </div>
        )
      )}
    </div>
  );
}
