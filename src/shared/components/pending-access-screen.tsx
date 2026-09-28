import { LogOut, Clock } from "lucide-react";

export function PendingAccessScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted">
            <Clock className="size-8 text-muted-foreground" />
          </div>
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight">
          Acesso Pendente
        </h1>
        <p className="mb-6 text-muted-foreground">
          Você ainda não tem acesso ao sistema. Aguarde o diretor liberar seu
          acesso cadastrando seus filhos com o mesmo e-mail utilizado no seu
          registro.
        </p>
        <p className="mb-8 text-sm text-muted-foreground">
          Se você acredita que isso é um erro, entre em contato com a direção do
          clube.
        </p>
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <LogOut className="size-4" />
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
