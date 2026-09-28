"use client";

import { useState, useTransition } from "react";
import { Check, Copy, KeyRound, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { adminResetPassword } from "@/modules/auth/actions/admin-reset-password";

interface AdminResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

export function AdminResetPasswordDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: AdminResetPasswordDialogProps) {
  const [error, setError] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    if (!next) {
      setError("");
      setTempPassword("");
      setCopied(false);
    }
    onOpenChange(next);
  }

  function handleReset() {
    setError("");
    startTransition(async () => {
      const result = await adminResetPassword({ userId });
      if (result.success) {
        setTempPassword(result.data.tempPassword);
      } else {
        setError(result.error);
      }
    });
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
    } catch {
      // Clipboard can be blocked; the password is on screen to read anyway.
      setCopied(false);
    }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5" />
            Redefinir senha
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {tempPassword
              ? `Senha temporária de ${userName}.`
              : `Gerar uma senha temporária para ${userName}?`}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {tempPassword ? (
          <div className="grid gap-4">
            <div className="rounded-md border bg-muted/50 p-4 text-center">
              <p className="font-mono text-lg font-semibold tracking-wider">
                {tempPassword}
              </p>
            </div>

            <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                Anote agora — esta senha não será mostrada de novo. Passe-a para{" "}
                {userName} e peça que entre no sistema: será exigida a criação
                de uma senha pessoal no primeiro acesso.
              </span>
            </div>

            <ResponsiveDialogFooter>
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px]"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="mr-2 size-4" />
                    Copiada
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 size-4" />
                    Copiar
                  </>
                )}
              </Button>
              <Button
                type="button"
                className="min-h-[44px]"
                onClick={() => handleOpenChange(false)}
              >
                Concluir
              </Button>
            </ResponsiveDialogFooter>
          </div>
        ) : (
          <div className="grid gap-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              A senha atual deixará de funcionar imediatamente. Use isto quando
              a pessoa não conseguir receber o e-mail de redefinição.
            </p>
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
                type="button"
                className="min-h-[44px]"
                disabled={isPending}
                onClick={handleReset}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  "Gerar senha temporária"
                )}
              </Button>
            </ResponsiveDialogFooter>
          </div>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
