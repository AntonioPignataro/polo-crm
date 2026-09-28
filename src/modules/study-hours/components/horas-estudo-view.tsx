"use client";

import { useState } from "react";
import { Clock, TrendingUp, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatStrip } from "@/shared/components/stat-strip";
import { StudyHourFormDialog } from "@/modules/study-hours/components/study-hour-form-dialog";
import type { BimesterStudyData } from "@/modules/study-hours/queries/get-study-hours";

interface MemberOption {
  id: string;
  fullName: string;
}

interface HorasEstudoViewProps {
  bimestres: BimesterStudyData[];
  members: MemberOption[];
}

export function HorasEstudoView({ bimestres, members }: HorasEstudoViewProps) {
  const [activeBimestre, setActiveBimestre] = useState(
    bimestres[0]?.value ?? ""
  );
  const [formOpen, setFormOpen] = useState(false);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  const currentBimestre = bimestres.find((b) => b.value === activeBimestre);

  if (!currentBimestre || bimestres.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="hidden md:block">
            <h1 className="text-3xl font-bold tracking-tight">
              Horas de Estudo
            </h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe as horas de estudo semanais dos sócios por bimestre.
            </p>
          </div>
          <Button onClick={() => setFormOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 size-4" />
            Registrar Horas
          </Button>
        </div>
        <StudyHourFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          members={members}
        />
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum registro de horas de estudo encontrado.
          </CardContent>
        </Card>
      </div>
    );
  }

  const avgHours =
    currentBimestre.socios.length > 0
      ? (
          currentBimestre.socios.reduce((acc, s) => acc + s.total, 0) /
          currentBimestre.socios.length
        ).toFixed(1)
      : "0";

  // Determine max weeks across all socios in this bimester
  const maxWeeks = Math.max(
    ...currentBimestre.socios.map((s) => s.weeks.length),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="hidden md:block">
          <h1 className="text-3xl font-bold tracking-tight">Horas de Estudo</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe as horas de estudo semanais dos sócios por bimestre.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 size-4" />
          Registrar Horas
        </Button>
      </div>

      <StudyHourFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        members={members}
      />

      {/* Summary */}
      <StatStrip desktopCols={2}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Sócios Acompanhados
            </CardDescription>
            <Clock className="size-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentBimestre.socios.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Média Geral
            </CardDescription>
            <TrendingUp className="size-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgHours}h</div>
          </CardContent>
        </Card>
      </StatStrip>

      {/* Bimester Tabs + Table */}
      <Tabs value={activeBimestre} onValueChange={setActiveBimestre}>
        <TabsList>
          {bimestres.map((b) => (
            <TabsTrigger key={b.value} value={b.value}>
              {b.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {bimestres.map((b) => (
          <TabsContent key={b.value} value={b.value}>
            <Card>
              <CardContent className="pt-6">
                {b.socios.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum registro neste bimestre.
                  </p>
                ) : (
                  <>
                    {/* Desktop: Table */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Sócio</TableHead>
                            {Array.from(
                              { length: b.socios[0]?.weeks.length ?? 0 },
                              (_, i) => (
                                <TableHead key={i} className="text-center">
                                  Sem {i + 1}
                                </TableHead>
                              )
                            )}
                            <TableHead className="text-center">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {b.socios.map((s) => (
                              <TableRow key={s.memberId}>
                                <TableCell className="font-medium">
                                  {s.name}
                                </TableCell>
                                {s.weeks.map((w, i) => (
                                  <TableCell
                                    key={i}
                                    className="text-center text-sm"
                                  >
                                    {w}h
                                  </TableCell>
                                ))}
                                <TableCell className="text-center font-bold">
                                  {s.total}h
                                </TableCell>
                              </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile: Expandable Cards */}
                    <div className="space-y-2 md:hidden">
                      {b.socios.map((s) => {
                        const isExpanded = expandedMember === s.memberId;
                        return (
                          <div
                            key={s.memberId}
                            className="rounded-lg border overflow-hidden"
                          >
                            <button
                              type="button"
                              className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
                              onClick={() =>
                                setExpandedMember(isExpanded ? null : s.memberId)
                              }
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-sm truncate">{s.name}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-bold text-sm">{s.total}h</span>
                                  {isExpanded ? (
                                    <ChevronUp className="size-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="size-4 text-muted-foreground" />
                                  )}
                                </div>
                              </div>
                            </button>
                            {isExpanded && (
                              <div className="border-t bg-muted/30 p-3">
                                <div className="grid grid-cols-2 gap-2">
                                  {s.weeks.map((w, i) => (
                                    <div key={i} className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">Sem {i + 1}:</span>
                                      <span className="font-medium">{w}h</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
