"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/modules/auth/schemas/change-password-schema";
import { changePassword } from "@/modules/auth/actions/change-password";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: ChangePasswordDialogProps) {
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  function handleOpenChange(next: boolean) {
    if (!next) {
      // Never leave typed passwords sitting in state after the dialog closes.
      reset();
      setServerError("");
      setSuccess(false);
      setShowPasswords(false);
    }
    onOpenChange(next);
  }

  function onSubmit(data: ChangePasswordInput) {
    setServerError("");
    startTransition(async () => {
      const result = await changePassword(data);
      if (result.success) {
        reset();
        setShowPasswords(false);
        setSuccess(true);
      } else {
        setServerError(result.error);
      }
    });
  }

  const inputType = showPasswords ? "text" : "password";

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5" />
            Alterar senha
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {success
              ? "Sua senha foi atualizada."
              : "Informe sua senha atual e escolha uma nova."}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {success ? (
          <div className="grid gap-4">
            <div className="flex items-start gap-2 rounded-md bg-primary/10 p-3 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                Senha alterada com sucesso. Use a nova senha no próximo acesso —
                você continua conectado agora.
              </span>
            </div>
            <ResponsiveDialogFooter>
              <Button
                type="button"
                className="min-h-[44px] w-full"
                onClick={() => handleOpenChange(false)}
              >
                Fechar
              </Button>
            </ResponsiveDialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            {serverError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {serverError}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="currentPassword">Senha atual</Label>
              <Input
                id="currentPassword"
                type={inputType}
                placeholder="Sua senha atual"
                autoComplete="current-password"
                {...register("currentPassword")}
              />
              {errors.currentPassword && (
                <p className="text-sm text-destructive">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input
                id="newPassword"
                type={inputType}
                placeholder="Mínimo 8 caracteres, com letra e número"
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

            <ResponsiveDialogFooter>
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px]"
                disabled={isPending}
                onClick={() => handleOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="min-h-[44px]"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  "Alterar senha"
                )}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
