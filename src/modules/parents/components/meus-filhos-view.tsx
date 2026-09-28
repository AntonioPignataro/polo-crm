"use client";

import { Star, Award, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatStrip } from "@/shared/components/stat-strip";
import { POLAR_DEFAULTS, GROUP_LABELS } from "@/lib/constants";
import type { ChildPolarRanking } from "@/modules/parents/queries/get-children-polares";
import type { PolarCategory, GroupType } from "@/types";

const POLAR_CATEGORIES = Object.keys(POLAR_DEFAULTS) as PolarCategory[];

function getMedalEmoji(index: number): string {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return `${index + 1}`;
}

interface MeusFilhosViewProps {
  filhos: ChildPolarRanking[];
}

export function MeusFilhosView({ filhos }: MeusFilhosViewProps) {
  if (filhos.length === 0) {
    return (
      <div className="space-y-6">
        <div className="hidden md:block">
          <h1 className="text-3xl font-bold tracking-tight">Meus Filhos</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe os polares dos seus filhos.
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum filho vinculado ao seu cadastro.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="hidden md:block">
        <h1 className="text-3xl font-bold tracking-tight">Meus Filhos</h1>
        <p className="text-muted-foreground mt-1">
          Acompanhe os polares e o desempenho dos seus filhos no clube.
        </p>
      </div>

      {/* Summary Cards */}
      <StatStrip desktopCols={3}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Total de Filhos
            </CardDescription>
            <Star className="size-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filhos.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Maior Pontuação
            </CardDescription>
            <Award className="size-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.max(...filhos.map((c) => c.total), 0)} pol
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Média
            </CardDescription>
            <TrendingUp className="size-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filhos.length > 0
                ? Math.round(
                    filhos.reduce((acc, c) => acc + c.total, 0) /
                      filhos.length
                  )
                : 0}{" "}
              pol
            </div>
          </CardContent>
        </Card>
      </StatStrip>

      {/* Detailed Cards per Child */}
      {filhos.map((child, index) => (
        <Card key={child.memberId}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {getMedalEmoji(index)}
                </span>
                <div>
                  <CardTitle className="text-lg">{child.fullName}</CardTitle>
                  <CardDescription>
                    {GROUP_LABELS[child.groupType as GroupType] ?? child.groupType}
                  </CardDescription>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {child.total}
                </div>
                <p className="text-muted-foreground text-xs">polares totais</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Desktop: Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    {POLAR_CATEGORIES.map((cat) => (
                      <TableHead key={cat} className="text-center text-xs">
                        {POLAR_DEFAULTS[cat].label}
                      </TableHead>
                    ))}
                    <TableHead className="text-center text-xs font-bold">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    {POLAR_CATEGORIES.map((cat) => {
                      const value = child.categoryTotals[cat];
                      return (
                        <TableCell key={cat} className="text-center">
                          <Badge
                            variant="outline"
                            className={
                              value > 0
                                ? "bg-green-50 text-green-700"
                                : value < 0
                                  ? "bg-red-50 text-red-700"
                                  : ""
                            }
                          >
                            {value}
                          </Badge>
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center font-bold">
                      {child.total}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Mobile: 3x3 Grid */}
            <div className="md:hidden">
              <div className="grid grid-cols-3 gap-3">
                {POLAR_CATEGORIES.map((cat) => {
                  const value = child.categoryTotals[cat];
                  return (
                    <div key={cat} className="text-center space-y-1">
                      <p className="text-[10px] text-muted-foreground">
                        {POLAR_DEFAULTS[cat].label}
                      </p>
                      <Badge
                        variant="outline"
                        className={
                          value > 0
                            ? "bg-green-50 text-green-700"
                            : value < 0
                              ? "bg-red-50 text-red-700"
                              : ""
                        }
                      >
                        {value}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
