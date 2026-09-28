"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  FileSignature,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { SignatureCanvas } from "@/modules/enrollment/components/signature-canvas";
import {
  saveParentSignature,
  type SignaturePayload,
} from "@/modules/parents/actions/save-parent-signature";
import type { UnsignedChild } from "@/modules/parents/queries/get-unsigned-children";
import { MODULE_LABELS } from "@/lib/constants";
import type { ModuleType } from "@/types";

const signatureFormSchema = z.object({
  signature: z.string().min(1, "Assinatura é obrigatória."),
  signerName: z.string().min(1, "Nome do responsável é obrigatório."),
  signerCpf: z.string().min(1, "CPF do responsável é obrigatório."),
  signerRelationship: z.string().min(1, "Parentesco é obrigatório."),
});

type SignatureFormData = z.infer<typeof signatureFormSchema>;

interface ParentSignatureScreenProps {
  unsignedChildren: UnsignedChild[];
  parentName: string;
}

export function ParentSignatureScreen({
  unsignedChildren,
  parentName,
}: ParentSignatureScreenProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const currentChild = unsignedChildren[currentIndex];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<SignatureFormData>({
    resolver: zodResolver(signatureFormSchema),
    defaultValues: {
      signature: "",
      signerName: parentName,
      signerCpf: "",
      signerRelationship: "",
    },
  });

  const watchSignature = watch("signature");

  function onSubmit(data: SignatureFormData) {
    setError(null);
    startTransition(async () => {
      const payload: SignaturePayload = {
        memberId: currentChild.id,
        ...data,
      };

      const result = await saveParentSignature(payload);
      if (result.success) {
        if (currentIndex < unsignedChildren.length - 1) {
          // Move to next unsigned child
          setCurrentIndex((i) => i + 1);
          reset({
            signature: "",
            signerName: parentName,
            signerCpf: data.signerCpf,
            signerRelationship: data.signerRelationship,
          });
        } else {
          // All children signed — refresh to go to dashboard
          router.refresh();
        }
      } else {
        setError(result.error);
      }
    });
  }

  if (!currentChild) {
    return null;
  }

  const modulesLabel = currentChild.modules
    .map((m) => MODULE_LABELS[m as ModuleType] ?? m)
    .join(", ");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Progress indicator for multiple children */}
        {unsignedChildren.length > 1 && (
          <div className="mb-6 text-center">
            <Badge variant="outline" className="text-sm">
              Assinatura {currentIndex + 1} de {unsignedChildren.length}
            </Badge>
          </div>
        )}

        {/* Header */}
        <div className="mb-8 text-center">
          <FileSignature className="mx-auto mb-3 size-12 text-green-700" />
          <h1 className="text-2xl font-bold tracking-tight">
            Assinatura do Responsável
          </h1>
          <p className="mt-1 text-muted-foreground">
            Para continuar, é necessário assinar a ficha do(a) seu(sua) filho(a).
          </p>
        </div>

        {/* Child Info */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <User className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{currentChild.fullName}</CardTitle>
                <CardDescription>
                  Código {String(currentChild.code).padStart(3, "0")} — {currentChild.groupType} — Módulo {modulesLabel}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Authorization Text */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">
              Compromisso entre os pais e o clube
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              Nós, pais, temos ciência do projeto pedagógico do Clube e contamos com o seu apoio na tarefa de educação do nosso filho, da qual somos os principais responsáveis. Comprometemo-nos, assim, a acompanhar nosso filho através das preceptorias, com frequência mínima semestral.
            </p>
            <p className="font-medium text-foreground">
              Neste ato, os PAIS AUTORIZAM:
            </p>
            <ol className="list-[lower-alpha] space-y-2 pl-5">
              <li>
                a publicação e a utilização, sem fins lucrativos, da imagem, do nome e da voz do sócio [seu filho], para os fins próprios do {currentChild.clubName} e para as atividades por ele organizadas, bem como nas suas publicações, sites, vídeos e demais materiais próprios;
              </li>
              <li>
                a participação do sócio [seu filho] nas atividades do {currentChild.clubName};
              </li>
              <li>
                que os monitores, professores, e outros colaboradores das atividades do {currentChild.clubName} possam entrar em contato com o sócio [o seu filho] pelo telefone (ligações, mensagens, etc.) ou redes sociais.
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Signature Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSignature className="size-4 text-green-700" />
                Dados e Assinatura do Responsável
              </CardTitle>
              <CardDescription>
                Preencha seus dados e assine no campo abaixo para confirmar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input {...register("signerName")} />
                  {errors.signerName && (
                    <p className="text-sm text-destructive">
                      {errors.signerName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>CPF *</Label>
                  <Input
                    {...register("signerCpf")}
                    placeholder="000.000.000-00"
                  />
                  {errors.signerCpf && (
                    <p className="text-sm text-destructive">
                      {errors.signerCpf.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Parentesco *</Label>
                  <Select
                    onValueChange={(v) => setValue("signerRelationship", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pai">Pai</SelectItem>
                      <SelectItem value="Mãe">Mãe</SelectItem>
                      <SelectItem value="Responsável">Responsável</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.signerRelationship && (
                    <p className="text-sm text-destructive">
                      {errors.signerRelationship.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Assinatura Digital *</Label>
                <SignatureCanvas
                  onSignatureChange={(dataUrl) => setValue("signature", dataUrl)}
                />
                {errors.signature && (
                  <p className="text-sm text-destructive">
                    {errors.signature.message}
                  </p>
                )}
                {watchSignature && (
                  <p className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 className="size-3" />
                    Assinatura capturada
                  </p>
                )}
              </div>

              {!watchSignature && (
                <div className="flex items-center gap-2 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
                  <AlertTriangle className="size-4 flex-shrink-0" />
                  <span>
                    A assinatura é obrigatória para prosseguir.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="size-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <FileSignature className="mr-2 size-4" />
            )}
            {isPending
              ? "Salvando assinatura..."
              : "Confirmar Assinatura"}
          </Button>
        </form>
      </div>
    </div>
  );
}
