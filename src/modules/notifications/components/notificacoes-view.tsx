"use client";

import { useState, useTransition } from "react";
import {
  Bell,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Cake,
  Plus,
  Mail,
  MailX,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatStrip } from "@/shared/components/stat-strip";
import {
  NOTIFICATION_TYPE_LABELS,
  ROLE_LABELS,
} from "@/lib/constants";
import { sendNotification } from "@/modules/notifications/actions/send-notification";
import { sendAlertNotifications } from "@/modules/notifications/actions/send-alert-notifications";
import { sendBirthdayNotifications } from "@/modules/notifications/actions/send-birthday-notifications";
import { toggleNotificationsPause } from "@/modules/notifications/actions/toggle-notifications-pause";
import type { NotificationItem } from "@/modules/notifications/queries/get-notifications";
import type { NotificationStats } from "@/modules/notifications/queries/get-notification-stats";
import type {
  NotificationRecipient,
  NotificationRecipientGroups,
} from "@/modules/notifications/queries/get-users-for-notification";
import type { NotificationType } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";

function formatDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function typeIcon(type: NotificationType) {
  switch (type) {
    case "ALERTA_PRESENCA":
      return <AlertTriangle className="size-4 text-orange-500" />;
    case "ALERTA_PRECEPTORIA":
      return <AlertTriangle className="size-4 text-red-500" />;
    case "ALERTA_FORMACAO_PAIS":
      return <AlertTriangle className="size-4 text-purple-500" />;
    case "LEMBRETE_ATIVIDADE":
      return <Bell className="size-4 text-green-500" />;
    case "GERAL":
      return <Bell className="size-4 text-gray-500" />;
    case "ANIVERSARIO":
      return <Cake className="size-4 text-pink-500" />;
    case "ALTERACAO_CALENDARIO":
      return <Bell className="size-4 text-blue-500" />;
  }
}

interface NotificacoesViewProps {
  notifications: NotificationItem[];
  stats: NotificationStats;
  users: NotificationRecipient[];
  userGroups: NotificationRecipientGroups;
}

export function NotificacoesView({
  notifications,
  stats,
  users,
  userGroups,
}: NotificacoesViewProps) {
  const [sendOpen, setSendOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [notifPaused, setNotifPaused] = useState(stats.notificationsPaused);

  const canTogglePause = ["SUPER_ADMIN", "DIRETOR", "PRECEPTOR", "MONITOR"].includes(
    stats.userRole
  );

  // Form state
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(
    new Set()
  );
  const [notifType, setNotifType] = useState<string>("GERAL");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [recipientSearch, setRecipientSearch] = useState("");

  function addRecipients(ids: string[]) {
    setSelectedRecipientIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
  }

  function removeRecipient(id: string) {
    setSelectedRecipientIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function toggleRecipient(id: string) {
    setSelectedRecipientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSend() {
    if (selectedRecipientIds.size === 0 || !title || !message) return;

    startTransition(async () => {
      const result = await sendNotification({
        recipientIds: Array.from(selectedRecipientIds),
        type: notifType as NotificationType,
        title,
        message,
      });

      if (result.success) {
        const sentText = `${result.data.created} notificação(ões) criada(s), ${result.data.sent} enviada(s) via e-mail.`;
        setFeedback({ type: "success", message: sentText });
        setSelectedRecipientIds(new Set());
        setTitle("");
        setMessage("");
        setTimeout(() => {
          setSendOpen(false);
          setFeedback(null);
          window.location.reload();
        }, 1500);
      } else {
        setFeedback({ type: "error", message: result.error });
      }
    });
  }

  function handleCheckAlerts() {
    startTransition(async () => {
      const result = await sendAlertNotifications();
      if (result.success) {
        const d = result.data;
        setFeedback({
          type: "success",
          message: `Verificação concluída: ${d.attendanceAlerts} alertas de presença, ${d.preceptoriaAlerts} alertas de preceptoria, ${d.formacaoPaisAlerts} alertas de formação de pais. ${d.notificationsCreated} notificações criadas, ${d.emailsSent} e-mails enviados com relatórios.`,
        });
        setTimeout(() => {
          setFeedback(null);
          window.location.reload();
        }, 3000);
      } else {
        setFeedback({ type: "error", message: result.error });
      }
    });
  }

  function handleBirthdayNotifications() {
    startTransition(async () => {
      const result = await sendBirthdayNotifications();
      if (result.success) {
        const d = result.data;
        if (d.birthdayCount === 0) {
          setFeedback({
            type: "success",
            message: "Nenhum aniversariante encontrado neste mês.",
          });
        } else {
          setFeedback({
            type: "success",
            message: `${d.birthdayCount} aniversariante(s) encontrado(s). ${d.created} notificações criadas, ${d.sent} enviadas via e-mail.`,
          });
        }
        setTimeout(() => {
          setFeedback(null);
          window.location.reload();
        }, 2500);
      } else {
        setFeedback({ type: "error", message: result.error });
      }
    });
  }

  function handleTogglePause() {
    startTransition(async () => {
      const result = await toggleNotificationsPause();
      if (result.success) {
        setNotifPaused(result.data.paused);
        setFeedback({
          type: "success",
          message: result.data.paused
            ? "Notificações automáticas pausadas."
            : "Notificações automáticas reativadas.",
        });
        setTimeout(() => setFeedback(null), 2500);
      } else {
        setFeedback({ type: "error", message: result.error });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="hidden md:block">
          <h1 className="text-3xl font-bold tracking-tight">Notificações</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie alertas e envie lembretes via e-mail.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canTogglePause && (
            <Button
              variant={notifPaused ? "destructive" : "outline"}
              onClick={handleTogglePause}
              disabled={isPending}
              className="flex-1 sm:flex-none"
            >
              {notifPaused ? (
                <>
                  <Bell className="mr-2 size-4" />
                  Notificações pausadas
                </>
              ) : (
                <>
                  <Bell className="mr-2 size-4" />
                  Notificações ativas
                </>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleCheckAlerts}
            disabled={isPending}
            className="flex-1 sm:flex-none"
          >
            <AlertTriangle className="mr-2 size-4" />
            Alertas
          </Button>
          <Button
            variant="outline"
            onClick={handleBirthdayNotifications}
            disabled={isPending}
            className="flex-1 sm:flex-none"
          >
            <Cake className="mr-2 size-4" />
            Aniversariantes
          </Button>
          <Button onClick={() => setSendOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 size-4" />
            Nova Notificação
          </Button>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <Card
          className={
            feedback.type === "success"
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }
        >
          <CardContent className="py-3 text-sm">
            {feedback.message}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <StatStrip desktopCols={4}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Total
            </CardDescription>
            <Bell className="size-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Enviadas
            </CardDescription>
            <CheckCircle2 className="size-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              Pendentes
            </CardDescription>
            <Clock className="size-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">
              E-mail
            </CardDescription>
            {stats.emailConfigured ? (
              <Mail className="size-5 text-green-600" />
            ) : (
              <MailX className="size-5 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {stats.emailConfigured ? (
                <span className="text-green-600">Configurado</span>
              ) : (
                <span className="text-muted-foreground">
                  Não configurado
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {stats.emailConfigured
                ? "Resend configurado"
                : "Configure RESEND_API_KEY no .env"}
            </p>
          </CardContent>
        </Card>
      </StatStrip>

      {/* Notification History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Notificações</CardTitle>
          <CardDescription>Últimas 100 notificações enviadas</CardDescription>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Nenhuma notificação registrada.
            </p>
          ) : (
            <>
              {/* Desktop: Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Destinatário</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications.map((n) => (
                      <TableRow key={n.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {typeIcon(n.type)}
                            <span className="text-xs">
                              {
                                NOTIFICATION_TYPE_LABELS[
                                  n.type as keyof typeof NOTIFICATION_TYPE_LABELS
                                ]
                              }
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{n.title}</p>
                            <p className="text-muted-foreground text-xs line-clamp-1">
                              {n.message}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{n.recipientName}</p>
                            <p className="text-muted-foreground text-xs">
                              {n.recipientEmail}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {n.sentAt ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              <Send className="mr-1 size-3" />
                              Enviado
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Clock className="mr-1 size-3" />
                              Pendente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateTime(n.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: Cards */}
              <div className="space-y-3 md:hidden">
                {notifications.map((n) => (
                  <div key={n.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {typeIcon(n.type)}
                        <span className="font-medium text-sm truncate">{n.title}</span>
                      </div>
                      {n.sentAt ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 shrink-0">
                          <Send className="mr-1 size-3" />
                          Enviado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="shrink-0">
                          <Clock className="mr-1 size-3" />
                          Pendente
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {n.message}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{n.recipientName}</span>
                      <span>{formatDateTime(n.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Send Notification Dialog */}
      <ResponsiveDialog open={sendOpen} onOpenChange={setSendOpen}>
        <ResponsiveDialogContent className="max-w-lg">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Nova Notificação</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Envie uma notificação via e-mail para um ou mais destinatários.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-4">
            {/* Quick-select buttons */}
            <div className="space-y-2">
              <Label>Seleção rápida</Label>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => addRecipients(users.map((u) => u.id))}
                >
                  Todos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => addRecipients(userGroups.parentsByGroup.G1)}
                >
                  Pais G1
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => addRecipients(userGroups.parentsByGroup.G2)}
                >
                  Pais G2
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => addRecipients(userGroups.parentsByGroup.G3)}
                >
                  Pais G3
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => addRecipients(userGroups.parentsByModule.QUINTA)}
                >
                  Pais Quinta-feira
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => addRecipients(userGroups.parentsByModule.SEXTA)}
                >
                  Pais Sexta-feira
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => addRecipients(userGroups.parentsByModule.SABADO)}
                >
                  Pais Sábado
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => addRecipients(userGroups.parentsBySextaSabado)}
                >
                  Pais Sexta e Sábado
                </Button>
              </div>
            </div>

            {/* Selected count and clear */}
            {selectedRecipientIds.size > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedRecipientIds.size} destinatário(s) selecionado(s)
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSelectedRecipientIds(new Set())}
                >
                  <X className="mr-1 size-3" />
                  Limpar
                </Button>
              </div>
            )}

            {/* Recipient list with checkboxes */}
            <div className="space-y-2">
              <Label>Destinatários</Label>
              <Input
                placeholder="Buscar por nome..."
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                className="h-8 text-sm"
              />
              <ScrollArea className="h-[160px] rounded-md border p-2">
                <div className="space-y-1">
                  {users
                    .filter((u) =>
                      u.name
                        .toLowerCase()
                        .includes(recipientSearch.toLowerCase())
                    )
                    .map((u) => (
                      <label
                        key={u.id}
                        className="flex items-center gap-2 rounded px-2 py-1 hover:bg-accent cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={selectedRecipientIds.has(u.id)}
                          onCheckedChange={() => toggleRecipient(u.id)}
                        />
                        <span className="flex-1 truncate">{u.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ??
                            u.role}
                        </span>
                      </label>
                    ))}
                </div>
              </ScrollArea>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={notifType} onValueChange={setNotifType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(NOTIFICATION_TYPE_LABELS).map(
                    ([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notif-title">Título</Label>
              <Input
                id="notif-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Lembrete de reunião"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notif-message">Mensagem</Label>
              <Textarea
                id="notif-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Corpo da mensagem..."
                rows={4}
              />
            </div>

            {feedback && (
              <p
                className={`text-sm ${
                  feedback.type === "success"
                    ? "text-green-600"
                    : "text-destructive"
                }`}
              >
                {feedback.message}
              </p>
            )}
          </div>

          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSend}
              disabled={
                selectedRecipientIds.size === 0 ||
                !title ||
                !message ||
                isPending
              }
            >
              {isPending
                ? "Enviando..."
                : `Enviar (${selectedRecipientIds.size})`}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}
