import { Suspense } from "react";
import { Compass, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegisterForm } from "@/modules/auth/components/register-form";

function RegisterFallback() {
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Compass className="size-6" />
        </div>
        <CardTitle className="text-xl">POLO</CardTitle>
        <CardDescription>Carregando...</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <div className="w-full max-w-sm">
      <Suspense fallback={<RegisterFallback />}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
