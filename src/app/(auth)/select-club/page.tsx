"use client";

import { useState } from "react";
import { Compass } from "lucide-react";
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
import { findClubUrl } from "./actions";

export default function SelectClubPage() {
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await findClubUrl(slug);
      if (result.success) {
        window.location.href = result.url;
      } else {
        setError(result.error);
        setIsLoading(false);
      }
    } catch {
      setError("Erro inesperado. Tente novamente.");
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Compass className="size-6" />
          </div>
          <CardTitle className="text-xl">Sistema Polo</CardTitle>
          <CardDescription>
            Acesse o seu clube digitando o identificador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="slug">Identificador do clube</Label>
              <Input
                id="slug"
                type="text"
                placeholder="ex: clubepolo"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Você acessará{" "}
                <span className="font-mono">
                  {slug || "<clube>"}.sistemapolo.com
                </span>
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Verificando..." : "Acessar"}
            </Button>
          </form>
        </CardContent>
        <div className="px-6 pb-4 text-center text-xs text-muted-foreground">
          Não sabe o identificador? Contate o administrador do seu clube.
        </div>
      </Card>
    </div>
  );
}
