import Link from "next/link";
import {
  Users,
  ClipboardCheck,
  Star,
  BookOpen,
  Calendar,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDashboardStats } from "@/modules/dashboard/queries/get-dashboard-stats";
import { getParentDashboard } from "@/modules/parents/queries/get-parent-dashboard";
import { getRequiredSession } from "@/lib/auth-utils";
import { ParentDashboard } from "@/modules/parents/components/parent-dashboard";
import { MODULE_LABELS } from "@/lib/constants";
import { StatStrip } from "@/shared/components/stat-strip";
import type { ModuleType } from "@/types";

export default async function DashboardPage() {
  const session = await getRequiredSession();

  if (session.role === "USUARIO" && session.parentId) {
    const data = await getParentDashboard();
    return <ParentDashboard data={data} />;
  }

  const stats = await getDashboardStats();

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Welcome */}
      <div className="hidden md:block">
        <h1 className="text-3xl font-bold tracking-tight">
          Bem-vindo ao Polo
        </h1>
        <p className="text-muted-foreground mt-1">
          Acompanhe o resumo do seu clube e acesse as funcionalidades
          rapidamente.
        </p>
      </div>

      {/* Stats Cards */}
      <StatStrip desktopCols={4}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Sócios Ativos
            </CardDescription>
            <Users className="size-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalActiveMembers}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              de {stats.totalMembers} sócios cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Polares Líder
            </CardDescription>
            <Star className="size-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            {stats.topPolarMembers.length > 0 ? (
              <>
                <div className="text-2xl font-bold">
                  {stats.topPolarMembers[0].fullName.split(" ").slice(0, 2).join(" ")}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {stats.topPolarMembers[0].totalPoints} polares acumulados
                </p>
              </>
            ) : (
              <>
                <div className="text-muted-foreground text-2xl font-bold">—</div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Nenhum polar registrado ainda
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Biblioteca
            </CardDescription>
            <BookOpen className="size-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.availableBooks}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              de {stats.totalBooks} livros disponíveis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Sócios por Grupo
            </CardDescription>
            <ClipboardCheck className="size-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {stats.membersByGroup.map((g) => (
                <div key={g.groupType} className="text-center">
                  <div className="text-lg font-bold">{g.count}</div>
                  <p className="text-muted-foreground text-xs">{g.groupType}</p>
                </div>
              ))}
              {stats.membersByGroup.length === 0 && (
                <p className="text-muted-foreground text-xs">Nenhum sócio</p>
              )}
            </div>
          </CardContent>
        </Card>
      </StatStrip>

      {/* Second Row: Members by Module + Top Polares */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Members by Module */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sócios por Módulo</CardTitle>
            <CardDescription>Distribuição de sócios ativos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.membersByModule.map((m) => {
                const percentage =
                  stats.totalActiveMembers > 0
                    ? Math.round((m.count / stats.totalActiveMembers) * 100)
                    : 0;
                return (
                  <div key={m.module} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        {MODULE_LABELS[m.module as ModuleType] ?? m.module}
                      </span>
                      <span className="text-muted-foreground">
                        {m.count} ({percentage}%)
                      </span>
                    </div>
                    <div className="bg-muted h-2 rounded-full">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {stats.membersByModule.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  Nenhum sócio cadastrado.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Polares Ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="size-4 text-yellow-500" />
              Ranking Polares
            </CardTitle>
            <CardDescription>Top 5 sócios com mais polares</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topPolarMembers.map((member, index) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 text-sm"
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <span className="flex-1">{member.fullName}</span>
                  <span className="font-semibold">
                    {member.totalPoints} pol
                  </span>
                </div>
              ))}
              {stats.topPolarMembers.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  Nenhum polar registrado ainda.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Atalhos para as tarefas mais comuns do dia a dia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/presenca">
                <ClipboardCheck />
                Registrar Presença
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/polares">
                <Star />
                Lançar Polares
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/socios/novo">
                <Users />
                Novo Sócio
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/atividades">
                <Calendar />
                Atividades
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
