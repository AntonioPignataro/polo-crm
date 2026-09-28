"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, KeyRound, Loader2, ShieldAlert } from "lucide-react";
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
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/modules/auth/schemas/change-password-schema";
import { changePassword } from "@/modules/auth/actions/change-password";

/**
 * Blocking screen shown when a director has issued a temporary password.
 * Mirrors the ParentSignatureScreen pattern: the dashboard layout renders this
 * instead of the app until the condition clears. There is no "later" button.
 */
export function ForcePasswordChangeScreen({ userName }: { userName: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  function onSubmit(data: ChangePasswordInput) {
    setServerError("");
    startTransition(async () => {
      const result = await changePassword(data);
      if (result.success) {
        // The gate reads mustChangePassword from the database, so refreshing
        // the server component is all it takes to be let through.
        router.refresh();
      } else {
        setServerError(result.error);
      }
    });
  }

  const inputType = showPasswords ? "text" : "password";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldAlert className="size-6" />
            </div>
            <CardTitle className="text-xl">Crie uma nova senha</CardTitle>
            <CardDescription>
              {userName}, sua senha foi redefinida pela direção. Escolha uma
              senha pessoal para continuar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
              {serverError && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {serverError}
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="currentPassword">Senha temporária</Label>
                <Input
                  id="currentPassword"
                  type={inputType}
                  placeholder="A senha que a direção lhe passou"
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
                  <>
                    <KeyRound className="mr-2 size-4" />
                    Salvar e continuar
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
