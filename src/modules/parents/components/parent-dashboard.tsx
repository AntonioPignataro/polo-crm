import Link from "next/link";
import {
  Star,
  Clock,
  Mountain,
  Calendar,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GROUP_LABELS, MODULE_LABELS } from "@/lib/constants";
import type { ParentDashboardData } from "@/modules/parents/queries/get-parent-dashboard";
import type { GroupType, ModuleType } from "@/types";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  CLUBE_REGULAR: "Clube",
  ATIVIDADE_EXTERNA: "Atividade externa",
  FORMACAO_PAIS: "Formação de Pais",
  SEM_ATIVIDADE: "Sem atividade",
  OUTROS: "Outro",
};

interface ParentDashboardProps {
  data: ParentDashboardData;
}

export function ParentDashboard({ data }: ParentDashboardProps) {
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Welcome */}
      <div className="hidden md:block">
        <h1 className="text-3xl font-bold tracking-tight">
          Bem-vindo, {data.parentName.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground mt-1">
          Acompanhe o desempenho dos seus filhos no Polo.
        </p>
      </div>

      {/* Children Summary Cards */}
      {data.children.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="mx-auto mb-4 size-12 opacity-50" />
            <p>Nenhum filho vinculado ao seu cadastro.</p>
            <p className="mt-1 text-sm">
              Entre em contato com a direção do clube.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.children.map((child) => (
            <Card key={child.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{child.fullName}</CardTitle>
                  <Badge variant="outline">
                    {GROUP_LABELS[child.groupType as GroupType] ?? child.groupType}
                  </Badge>
                </div>
                <CardDescription>
                  Módulo {child.modules.map((mod: ModuleType) => MODULE_LABELS[mod] ?? mod).join(", ")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-yellow-600">
                      <Star className="size-4" />
                    </div>
                    <div className="mt-1 text-xl font-bold">
                      {child.totalPolares}
                    </div>
                    <p className="text-muted-foreground text-xs">Polares</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-blue-600">
                      <Clock className="size-4" />
                    </div>
                    <div className="mt-1 text-xl font-bold">
                      {child.totalStudyHours}h
                    </div>
                    <p className="text-muted-foreground text-xs">Estudo</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-green-600">
                      <Mountain className="size-4" />
                    </div>
                    <div className="mt-1 text-xl font-bold">
                      {child.upcomingActivities}
                    </div>
                    <p className="text-muted-foreground text-xs">Atividades</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions + Upcoming Events */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Tarefas disponíveis para pais.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/horas-estudo">
                  <Clock />
                  Registrar Horas de Estudo
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/atividades">
                  <Mountain />
                  Ver Atividades
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/meus-filhos">
                  <Star />
                  Polares dos Filhos
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/calendario">
                  <Calendar />
                  Calendário
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="size-4 text-primary" />
              Próximos Eventos
            </CardTitle>
            <CardDescription>Eventos agendados do clube</CardDescription>
          </CardHeader>
          <CardContent>
            {data.upcomingEvents.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhum evento próximo.
              </p>
            ) : (
              <div className="space-y-3">
                {data.upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {formatDate(event.date)}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium">{event.title}</p>
                      <p className="text-muted-foreground text-xs">
                        {EVENT_TYPE_LABELS[event.type] ?? event.type}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
