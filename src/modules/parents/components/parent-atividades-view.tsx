"use client";

import { useState, useTransition } from "react";
import {
  Calendar,
  Users,
  DollarSign,
  MapPin,
  ChevronRight,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACTIVITY_STATUS_LABELS } from "@/lib/constants";
import { registerChildInActivity } from "@/modules/parents/actions/register-child-in-activity";
import type { ActivityItem } from "@/modules/activities/queries/get-activities";
import type { ActivityStatus } from "@/types";

function statusBadgeClass(status: ActivityStatus): string {
  switch (status) {
    case "PLANEJADA":
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    case "INSCRICOES_ABERTAS":
      return "bg-green-100 text-green-800 hover:bg-green-100";
    case "INSCRICOES_ENCERRADAS":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
    case "CONCLUIDA":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    case "CANCELADA":
      return "bg-red-100 text-red-800 hover:bg-red-100";
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR");
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface ChildOption {
  id: string;
  fullName: string;
}

interface ParentAtividadesViewProps {
  activities: ActivityItem[];
  children: ChildOption[];
}

export function ParentAtividadesView({
  activities,
  children,
}: ParentAtividadesViewProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<ActivityItem | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerActivity, setRegisterActivity] =
    useState<ActivityItem | null>(null);
  const [selectedChild, setSelectedChild] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function handleOpenDetail(atividade: ActivityItem) {
    setSelected(atividade);
    setDetailOpen(true);
  }

  function handleOpenRegister(atividade: ActivityItem) {
    setRegisterActivity(atividade);
    setSelectedChild("");
    setError("");
    setSuccessMessage("");
    setRegisterOpen(true);
  }

  function handleRegister() {
    if (!registerActivity || !selectedChild) return;

    startTransition(async () => {
      const result = await registerChildInActivity({
        activityId: registerActivity.id,
        memberId: selectedChild,
      });

      if (result.success) {
        setSuccessMessage("Filho inscrito com sucesso!");
        setError("");
        setTimeout(() => {
          setRegisterOpen(false);
          window.location.reload();
        }, 1000);
      } else {
        setError(result.error);
        setSuccessMessage("");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="hidden md:block">
        <h1 className="text-3xl font-bold tracking-tight">Atividades</h1>
        <p className="text-muted-foreground mt-1">
          Veja as atividades do clube e inscreva seus filhos.
        </p>
      </div>

      {/* Activities Grid */}
      {activities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma atividade cadastrada.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((a) => (
            <Card
              key={a.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => handleOpenDetail(a)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base leading-tight">
                    {a.name}
                  </CardTitle>
                  <Badge className={statusBadgeClass(a.status)}>
                    {ACTIVITY_STATUS_LABELS[a.status]}
                  </Badge>
                </div>
                {a.location && (
                  <CardDescription className="flex items-center gap-1 text-xs">
                    <MapPin className="size-3" />
                    {a.location}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {a.startDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="text-muted-foreground size-4" />
                      <span>
                        {formatDate(a.startDate)}
                        {a.endDate &&
                          a.startDate !== a.endDate &&
                          ` - ${formatDate(a.endDate)}`}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="text-muted-foreground size-4" />
                    <span>
                      {a.totalInscritos}
                      {a.maxVagas ? `/${a.maxVagas}` : ""} inscritos
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t pt-3 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <DollarSign className="size-4" />
                    <span>
                      Sócio:{" "}
                      {a.custoSocio == null || a.custoSocio === 0
                        ? "Gratuito"
                        : formatCurrency(a.custoSocio)}
                    </span>
                  </div>
                  {a.status === "INSCRICOES_ABERTAS" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenRegister(a);
                      }}
                    >
                      <UserPlus className="mr-1 size-3" />
                      Inscrever
                    </Button>
                  ) : (
                    <ChevronRight className="text-muted-foreground size-4" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <ResponsiveDialog open={detailOpen} onOpenChange={setDetailOpen}>
        <ResponsiveDialogContent className="max-w-lg">
          {selected && (
            <>
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle>{selected.name}</ResponsiveDialogTitle>
                <ResponsiveDialogDescription>
                  {selected.description ?? "Sem descrição."}
                </ResponsiveDialogDescription>
              </ResponsiveDialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className={statusBadgeClass(selected.status)}>
                    {ACTIVITY_STATUS_LABELS[selected.status]}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selected.startDate && (
                    <div>
                      <p className="text-muted-foreground text-xs">Datas</p>
                      <p className="font-medium">
                        {formatDate(selected.startDate)}
                        {selected.endDate &&
                          selected.startDate !== selected.endDate &&
                          ` a ${formatDate(selected.endDate)}`}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground text-xs">Inscritos</p>
                    <p className="font-medium">
                      {selected.totalInscritos}
                      {selected.maxVagas ? ` / ${selected.maxVagas}` : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Custo por Sócio
                    </p>
                    <p className="font-medium">
                      {selected.custoSocio == null || selected.custoSocio === 0
                        ? "Gratuito"
                        : formatCurrency(selected.custoSocio)}
                    </p>
                  </div>
                </div>

                {selected.inscritos.length > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-2 text-xs font-medium">
                      Inscritos ({selected.inscritos.length})
                    </p>
                    <ul className="space-y-1">
                      {selected.inscritos.map((name) => (
                        <li
                          key={name}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span className="size-1.5 rounded-full bg-primary" />
                          {name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <ResponsiveDialogFooter className="gap-2">
                {selected.status === "INSCRICOES_ABERTAS" && (
                  <Button
                    onClick={() => {
                      setDetailOpen(false);
                      handleOpenRegister(selected);
                    }}
                  >
                    <UserPlus className="mr-1 size-4" />
                    Inscrever Filho
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setDetailOpen(false)}
                >
                  Fechar
                </Button>
              </ResponsiveDialogFooter>
            </>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Register Child Dialog */}
      <ResponsiveDialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <ResponsiveDialogContent className="max-w-sm">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Inscrever Filho</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {registerActivity
                ? `Inscreva seu filho em: ${registerActivity.name}`
                : "Selecione o filho para inscrever."}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Filho</label>
              <Select
                value={selectedChild}
                onValueChange={setSelectedChild}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o filho" />
                </SelectTrigger>
                <SelectContent>
                  {children.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {successMessage && (
              <p className="text-sm text-green-600">{successMessage}</p>
            )}
          </div>

          <ResponsiveDialogFooter>
            <Button
              variant="outline"
              onClick={() => setRegisterOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRegister}
              disabled={!selectedChild || isPending}
            >
              {isPending ? "Inscrevendo..." : "Confirmar Inscrição"}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}
