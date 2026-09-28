"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Compass, Eye, EyeOff, Loader2 } from "lucide-react";
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
import { PASSWORD_HINT } from "@/modules/auth/schemas/password-rules";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/modules/auth/schemas/reset-password-schema";
import { resetPassword } from "@/modules/auth/actions/reset-password";

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, newPassword: "", confirmPassword: "" },
  });

  function onSubmit(data: ResetPasswordInput) {
    setServerError("");
    startTransition(async () => {
      const result = await resetPassword(data);
      if (result.success) {
        // Deliberately no auto-login — they prove the new password works.
        router.push("/login?reset=true");
      } else {
        setServerError(result.error);
      }
    });
  }

  const inputType = showPasswords ? "text" : "password";

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Compass className="size-6" />
        </div>
        <CardTitle className="text-xl">Criar nova senha</CardTitle>
        <CardDescription>
          Escolha uma nova senha para acessar o sistema.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <input type="hidden" {...register("token")} />

          {serverError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {serverError}{" "}
              <Link
                href="/esqueci-senha"
                className="underline underline-offset-4"
              >
                Pedir novo link
              </Link>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="newPassword">Nova senha</Label>
            <Input
              id="newPassword"
              type={inputType}
              placeholder={PASSWORD_HINT}
              autoComplete="new-password"
              {...register("newPassword")}
            />
            {errors.newPassword && (
              <p className="text-sm text-destructive">
                {errors.newPassword.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
            <Input
              id="confirmPassword"
              type={inputType}
              placeholder="Repita a nova senha"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowPasswords((v) => !v)}
            className="flex min-h-[44px] items-center gap-2 self-start text-sm text-muted-foreground hover:text-foreground"
          >
            {showPasswords ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
            {showPasswords ? "Ocultar senhas" : "Mostrar senhas"}
          </button>

          <Button
            type="submit"
            className="min-h-[44px] w-full"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar nova senha"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
