"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
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
  createMemberSchema,
  type CreateMemberInput,
} from "@/modules/members/schemas/member-schema";
import { createMember } from "@/modules/members/actions/create-member";

export function NovoSocioForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<CreateMemberInput>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: {
      fullName: "",
      birthDate: "",
      address: "",
      groupType: undefined,
      modules: [],
      preceptorId: "",
      enrollmentDate: new Date().toISOString().split("T")[0],
      father: {
        fullName: "",
        phone: "",
        email: "",
        cpf: "",
        profession: "",
      },
      mother: {
        fullName: "",
        phone: "",
        email: "",
        cpf: "",
        profession: "",
      },
      guardians: [],
    },
  });

  const {
    fields: guardianFields,
    append: appendGuardian,
    remove: removeGuardian,
  } = useFieldArray({ control, name: "guardians" });

  const watchGroupType = watch("groupType");
  const watchModules = watch("modules") ?? [];

  function handleGroupChange(value: string) {
    const group = value as "G1" | "G2" | "G3";
    setValue("groupType", group);
    // G3 auto-sets QUINTA; G1/G2 clears modules for user selection
    if (group === "G3") {
      setValue("modules", ["QUINTA"]);
    } else {
      setValue("modules", []);
    }
  }

  function handleModuleSelection(selection: "SEXTA" | "SABADO" | "SEXTA_SABADO") {
    if (selection === "SEXTA") {
      setValue("modules", ["SEXTA"]);
    } else if (selection === "SABADO") {
      setValue("modules", ["SABADO"]);
    } else {
      setValue("modules", ["SEXTA", "SABADO"]);
    }
  }

  function getActiveModuleButton(): string | null {
    if (watchModules.length === 2 && watchModules.includes("SEXTA") && watchModules.includes("SABADO")) {
      return "SEXTA_SABADO";
    }
    if (watchModules.length === 1 && watchModules[0] === "SEXTA") return "SEXTA";
    if (watchModules.length === 1 && watchModules[0] === "SABADO") return "SABADO";
    return null;
  }

  function onSubmit(data: CreateMemberInput) {
    startTransition(async () => {
      // Clean up empty parent data (don't send if name is empty)
      const cleanData = { ...data };
      if (!cleanData.father?.fullName) {
        cleanData.father = undefined;
      }
      if (!cleanData.mother?.fullName) {
        cleanData.mother = undefined;
      }
      // Filter out guardians with empty names
      cleanData.guardians = (cleanData.guardians ?? []).filter(
        (g) => g.fullName?.trim()
      );

      const result = await createMember(cleanData);
      if (result.success) {
        router.push("/socios");
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  }

  const activeButton = getActiveModuleButton();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/socios">
            <ArrowLeft />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <div className="hidden md:block">
          <h1 className="text-3xl font-bold tracking-tight">Novo Sócio</h1>
          <p className="text-muted-foreground text-sm">
            Preencha os dados abaixo para cadastrar um novo sócio.
          </p>
        </div>
      </div>

      {/* Dados Pessoais */}
      <Card>
        <CardHeader>
          <CardTitle>Dados Pessoais</CardTitle>
          <CardDescription>Informações básicas do sócio.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="fullName">Nome Completo *</Label>
            <Input
              id="fullName"
              placeholder="Nome completo do sócio"
              {...register("fullName")}
            />
            {errors.fullName && (
              <p className="text-sm text-destructive">
                {errors.fullName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthDate">Data de Nascimento *</Label>
            <Controller
              control={control}
              name="birthDate"
              render={({ field }) => (
                <DatePicker
                  id="birthDate"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            {errors.birthDate && (
              <p className="text-sm text-destructive">
                {errors.birthDate.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              placeholder="Rua, número, bairro, cidade"
              {...register("address")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Clube */}
      <Card>
        <CardHeader>
          <CardTitle>Clube</CardTitle>
          <CardDescription>
            Configurações do sócio dentro do clube.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Grupo *</Label>
            <Select onValueChange={handleGroupChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="G1">G1</SelectItem>
                <SelectItem value="G2">G2</SelectItem>
                <SelectItem value="G3">G3</SelectItem>
              </SelectContent>
            </Select>
            {errors.groupType && (
              <p className="text-sm text-destructive">
                {errors.groupType.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Módulo *</Label>
            {watchGroupType === "G3" ? (
              <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                Quinta-feira (automático para G3)
              </div>
            ) : watchGroupType === "G1" || watchGroupType === "G2" ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={activeButton === "SEXTA" ? "default" : "outline"}
                  onClick={() => handleModuleSelection("SEXTA")}
                >
                  Sexta-feira
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={activeButton === "SABADO" ? "default" : "outline"}
                  onClick={() => handleModuleSelection("SABADO")}
                >
                  Sábado
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={activeButton === "SEXTA_SABADO" ? "default" : "outline"}
                  onClick={() => handleModuleSelection("SEXTA_SABADO")}
                >
                  Sexta-feira e Sábado
                </Button>
              </div>
            ) : (
              <div className="flex h-9 items-center rounded-md border px-3 text-sm text-muted-foreground">
                Selecione um grupo primeiro
              </div>
            )}
            {errors.modules && (
              <p className="text-sm text-destructive">
                {errors.modules.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="enrollmentDate">Data de Matrícula</Label>
            <Controller
              control={control}
              name="enrollmentDate"
              render={({ field }) => (
                <DatePicker
                  id="enrollmentDate"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dados do Pai */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Pai</CardTitle>
          <CardDescription>
            Informações do responsável paterno (opcional).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Nome Completo</Label>
            <Input
              placeholder="Nome do pai"
              {...register("father.fullName")}
            />
            {errors.father?.fullName && (
              <p className="text-sm text-destructive">
                {errors.father.fullName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>CPF</Label>
            <Input
              placeholder="000.000.000-00"
              {...register("father.cpf")}
            />
          </div>
          <div className="space-y-2">
            <Label>Celular</Label>
            <Input
              placeholder="(00) 00000-0000"
              {...register("father.phone")}
            />
          </div>
          <div className="space-y-2">
            <Label>E-mail *</Label>
            <Input
              type="email"
              placeholder="email@exemplo.com"
              {...register("father.email")}
            />
            {errors.father?.email && (
              <p className="text-sm text-destructive">
                {errors.father.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Profissão</Label>
            <Input
              placeholder="Profissão"
              {...register("father.profession")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dados da Mae */}
      <Card>
        <CardHeader>
          <CardTitle>Dados da Mãe</CardTitle>
          <CardDescription>
            Informações da responsável materna (opcional).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Nome Completo</Label>
            <Input
              placeholder="Nome da mãe"
              {...register("mother.fullName")}
            />
            {errors.mother?.fullName && (
              <p className="text-sm text-destructive">
                {errors.mother.fullName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>CPF</Label>
            <Input
              placeholder="000.000.000-00"
              {...register("mother.cpf")}
            />
          </div>
          <div className="space-y-2">
            <Label>Celular</Label>
            <Input
              placeholder="(00) 00000-0000"
              {...register("mother.phone")}
            />
          </div>
          <div className="space-y-2">
            <Label>E-mail *</Label>
            <Input
              type="email"
              placeholder="email@exemplo.com"
              {...register("mother.email")}
            />
            {errors.mother?.email && (
              <p className="text-sm text-destructive">
                {errors.mother.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Profissão</Label>
            <Input
              placeholder="Profissão"
              {...register("mother.profession")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Responsáveis Adicionais */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Responsáveis Adicionais</CardTitle>
              <CardDescription>
                Adicione outros responsáveis pelo sócio (opcional).
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
                key={field.id}
                className="relative rounded-lg border p-4 space-y-4"
              >
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
                        {errors.guardians[index].sex?.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Nome Completo *</Label>
                    <Input
                      placeholder="Nome do responsável"
                      {...register(`guardians.${index}.fullName`)}
                    />
                    {errors.guardians?.[index]?.fullName && (
                      <p className="text-sm text-destructive">
                        {errors.guardians[index].fullName?.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail *</Label>
                    <Input
                      type="email"
                      placeholder="email@exemplo.com"
                      {...register(`guardians.${index}.email`)}
                    />
                    {errors.guardians?.[index]?.email && (
                      <p className="text-sm text-destructive">
                        {errors.guardians[index].email?.message}
                      </p>
                    )}
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

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" type="button" asChild>
          <Link href="/socios">Cancelar</Link>
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 size-4" />
              Salvar Sócio
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
