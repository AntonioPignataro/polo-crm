"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Compass, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  requestResetSchema,
  type RequestResetInput,
} from "@/modules/auth/schemas/reset-password-schema";
import { requestPasswordReset } from "@/modules/auth/actions/request-password-reset";

export function ForgotPasswordForm() {
  const [serverError, setServerError] = useState("");
  const [sentMessage, setSentMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestResetInput>({
    resolver: zodResolver(requestResetSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(data: RequestResetInput) {
    setServerError("");
    startTransition(async () => {
      const result = await requestPasswordReset(data);
      if (result.success) {
        setSentMessage(result.data.message);
      } else {
        setServerError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Compass className="size-6" />
        </div>
        <CardTitle className="text-xl">Esqueci minha senha</CardTitle>
        <CardDescription>
          {sentMessage
            ? "Pedido registrado."
            : "Informe seu e-mail e enviaremos um link para criar uma nova senha."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sentMessage ? (
          <div className="grid gap-4">
            <div className="flex items-start gap-2 rounded-md bg-primary/10 p-3 text-sm">
              <MailCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{sentMessage}</span>
            </div>
            <Button asChild variant="outline" className="min-h-[44px] w-full">
              <Link href="/login">Voltar para o login</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            {serverError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {serverError}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="min-h-[44px] w-full"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar link"
              )}
            </Button>
          </form>
        )}
      </CardContent>
      {!sentMessage && (
        <div className="pb-4 text-center text-sm text-muted-foreground">
          Lembrou a senha?{" "}
          <Link
            href="/login"
            className="text-primary underline-offset-4 hover:underline"
          >
            Entre aqui
          </Link>
        </div>
      )}
    </Card>
  );
}
