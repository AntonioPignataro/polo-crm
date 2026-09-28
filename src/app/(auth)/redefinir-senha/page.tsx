import Link from "next/link";
import { Suspense } from "react";
import { Compass, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResetPasswordForm } from "@/modules/auth/components/reset-password-form";

function ResetFallback() {
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Compass className="size-6" />
        </div>
        <CardTitle className="text-xl">Criar nova senha</CardTitle>
        <CardDescription>Carregando...</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Compass className="size-6" />
            </div>
            <CardTitle className="text-xl">Link inválido</CardTitle>
            <CardDescription>
              Este endereço não contém um link de redefinição válido.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button asChild className="min-h-[44px] w-full">
              <Link href="/esqueci-senha">Pedir novo link</Link>
            </Button>
            <Button asChild variant="outline" className="min-h-[44px] w-full">
              <Link href="/login">Voltar para o login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <Suspense fallback={<ResetFallback />}>
        <ResetPasswordForm token={token} />
      </Suspense>
    </div>
  );
}
