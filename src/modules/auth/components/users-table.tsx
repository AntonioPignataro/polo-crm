"use client";

import { useState, useMemo, useTransition } from "react";
import { KeyRound, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { UserListItem } from "../queries/get-users";
import type { UserRole } from "@/types";
import { ROLE_LABELS } from "@/lib/constants";
import { MobileFilterToggle } from "@/shared/components/mobile-filter-toggle";
import { updateUserRole } from "../actions/update-user-role";
import { toggleUserActive } from "../actions/toggle-user-active";
import { AdminResetPasswordDialog } from "./admin-reset-password-dialog";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL = "Todos";

function roleBadgeClassName(role: UserRole) {
  switch (role) {
    case "SUPER_ADMIN":
      return "bg-purple-600 text-white hover:bg-purple-600/90";
    case "DIRETOR":
      return "bg-blue-600 text-white hover:bg-blue-600/90";
    case "PRECEPTOR":
      return "bg-green-600 text-white hover:bg-green-600/90";
    case "MONITOR":
      return "bg-yellow-500 text-white hover:bg-yellow-500/90";
    case "USUARIO":
      return "bg-gray-400 text-white hover:bg-gray-400/90";
  }
}

function statusBadgeClassName(isActive: boolean) {
  return isActive
    ? "bg-green-600 text-white hover:bg-green-600/90"
    : "bg-red-500 text-white hover:bg-red-500/90";
}

/**
 * Returns the roles that the current user can assign.
 * SUPER_ADMIN can assign all roles.
 * DIRETOR can assign DIRETOR and below.
 */
function getAssignableRoles(currentUserRole: UserRole): UserRole[] {
  if (currentUserRole === "SUPER_ADMIN") {
    return ["SUPER_ADMIN", "DIRETOR", "PRECEPTOR", "MONITOR", "USUARIO"];
  }
  // DIRETOR can assign from DIRETOR down
  return ["DIRETOR", "PRECEPTOR", "MONITOR", "USUARIO"];
}

/**
 * Whether the current user can manage (change role/status of) a target user.
 */
function canManageUser(
  currentUserRole: UserRole,
  currentUserId: string,
  targetUser: UserListItem
): boolean {
  // Cannot manage yourself
  if (currentUserId === targetUser.id) return false;
  // SUPER_ADMIN can manage anyone
  if (currentUserRole === "SUPER_ADMIN") return true;
  // DIRETOR cannot manage SUPER_ADMIN
  if (targetUser.role === "SUPER_ADMIN") return false;
  return true;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface UsersTableProps {
  initialUsers: UserListItem[];
  currentUserRole: UserRole;
  currentUserId: string;
}

export function UsersTable({
  initialUsers,
  currentUserRole,
  currentUserId,
}: UsersTableProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId: string;
    userName: string;
    action: "role" | "status";
    newRole?: UserRole;
    newActive?: boolean;
  }>({ open: false, userId: "", userName: "", action: "role" });

  // Password reset dialog state (separate flow: it reveals a temp password)
  const [resetDialog, setResetDialog] = useState<{
    open: boolean;
    userId: string;
    userName: string;
  }>({ open: false, userId: "", userName: "" });

  const filtered = useMemo(() => {
    return initialUsers.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === ALL || u.role === roleFilter;
      const matchesStatus =
        statusFilter === ALL ||
        (statusFilter === "ATIVO" && u.isActive) ||
        (statusFilter === "INATIVO" && !u.isActive);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [initialUsers, search, roleFilter, statusFilter]);

  const assignableRoles = getAssignableRoles(currentUserRole);

  const activeFilterCount = [roleFilter, statusFilter].filter(
    (v) => v !== ALL
  ).length;

  function handleRoleChange(user: UserListItem, newRole: string) {
    if (newRole === user.role) return;
    setConfirmDialog({
      open: true,
      userId: user.id,
      userName: user.name,
      action: "role",
      newRole: newRole as UserRole,
    });
  }

  function handleStatusToggle(user: UserListItem) {
    setConfirmDialog({
      open: true,
      userId: user.id,
      userName: user.name,
      action: "status",
      newActive: !user.isActive,
    });
  }

  function confirmAction() {
    setError("");
    startTransition(async () => {
      let result;
      if (confirmDialog.action === "role" && confirmDialog.newRole) {
        result = await updateUserRole({
          userId: confirmDialog.userId,
          role: confirmDialog.newRole,
        });
      } else if (
        confirmDialog.action === "status" &&
        confirmDialog.newActive !== undefined
      ) {
        result = await toggleUserActive({
          userId: confirmDialog.userId,
          isActive: confirmDialog.newActive,
        });
      }
      if (result && !result.success) {
        setError(result.error);
      }
      setConfirmDialog((prev) => ({ ...prev, open: false }));
    });
  }

  return (
    <>
      {/* Header */}
      <div className="hidden md:block">
        <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
      </div>

      {/* Search — always visible */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filters — collapsible on mobile */}
      <MobileFilterToggle activeCount={activeFilterCount}>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-auto">
            <SelectValue placeholder="Papel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            {Object.entries(ROLE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-auto">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            <SelectItem value="ATIVO">Ativo</SelectItem>
            <SelectItem value="INATIVO">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </MobileFilterToggle>

      {/* Error message */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                >
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => {
                const manageable = canManageUser(
                  currentUserRole,
                  currentUserId,
                  user
                );
                const isSelf = user.id === currentUserId;

                return (
                  <TableRow
                    key={user.id}
                    className={!user.isActive ? "opacity-60" : ""}
                  >
                    <TableCell className="font-medium">
                      {user.name}
                      {isSelf && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (você)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {manageable ? (
                        <Select
                          value={user.role}
                          onValueChange={(v) => handleRoleChange(user, v)}
                          disabled={isPending}
                        >
                          <SelectTrigger className="h-8 w-auto">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {assignableRoles.map((role) => (
                              <SelectItem key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={roleBadgeClassName(user.role)}>
                          {ROLE_LABELS[user.role]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{user.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge className={statusBadgeClassName(user.isActive)}>
                        {user.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.createdAt}</TableCell>
                    <TableCell className="text-right">
                      {manageable && (
                        <div className="flex justify-end gap-2">
                          {/* Icon-only: a second labelled button pushed the
                              table past the viewport with real-world names. */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="size-8"
                                disabled={isPending}
                                onClick={() =>
                                  setResetDialog({
                                    open: true,
                                    userId: user.id,
                                    userName: user.name,
                                  })
                                }
                              >
                                <KeyRound className="size-4" />
                                <span className="sr-only">
                                  Redefinir senha de {user.name}
                                </span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Redefinir senha</TooltipContent>
                          </Tooltip>
                          <Button
                            variant={user.isActive ? "destructive" : "default"}
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleStatusToggle(user)}
                          >
                            {user.isActive ? "Desativar" : "Ativar"}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-md border p-6 text-center text-muted-foreground">
            Nenhum usuário encontrado.
          </div>
        ) : (
          filtered.map((user) => {
            const manageable = canManageUser(
              currentUserRole,
              currentUserId,
              user
            );
            const isSelf = user.id === currentUserId;

            return (
              <div
                key={user.id}
                className={`rounded-lg border p-4 space-y-3 ${
                  !user.isActive ? "opacity-60" : ""
                }`}
              >
                {/* Top: Name + Status badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {user.name}
                      {isSelf && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (você)
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <Badge className={statusBadgeClassName(user.isActive)}>
                    {user.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </div>

                {/* Middle: Role + Phone + Date */}
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <Badge className={roleBadgeClassName(user.role)}>
                    {ROLE_LABELS[user.role]}
                  </Badge>
                  {user.phone && <span>{user.phone}</span>}
                  <span>Desde {user.createdAt}</span>
                </div>

                {/* Actions */}
                {manageable && (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Select
                      value={user.role}
                      onValueChange={(v) => handleRoleChange(user, v)}
                      disabled={isPending}
                    >
                      <SelectTrigger className="h-9 flex-1">
                        <SelectValue placeholder="Alterar papel" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignableRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() =>
                        setResetDialog({
                          open: true,
                          userId: user.id,
                          userName: user.name,
                        })
                      }
                      className="h-9"
                    >
                      Redefinir senha
                    </Button>
                    <Button
                      variant={user.isActive ? "destructive" : "default"}
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleStatusToggle(user)}
                      className="h-9"
                    >
                      {user.isActive ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} de {initialUsers.length} usuário(s)
      </p>

      {/* Confirmation Dialog */}
      <ResponsiveDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
      >
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Confirmar ação</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {confirmDialog.action === "role" && confirmDialog.newRole
                ? `Alterar o papel de "${confirmDialog.userName}" para ${ROLE_LABELS[confirmDialog.newRole]}?`
                : confirmDialog.action === "status"
                  ? confirmDialog.newActive
                    ? `Reativar a conta de "${confirmDialog.userName}"?`
                    : `Desativar a conta de "${confirmDialog.userName}"? O usuário não poderá mais acessar o sistema.`
                  : ""}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog((prev) => ({ ...prev, open: false }))
              }
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              variant={
                confirmDialog.action === "status" && !confirmDialog.newActive
                  ? "destructive"
                  : "default"
              }
              onClick={confirmAction}
              disabled={isPending}
            >
              {isPending ? "Processando..." : "Confirmar"}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <AdminResetPasswordDialog
        open={resetDialog.open}
        onOpenChange={(open) => setResetDialog((prev) => ({ ...prev, open }))}
        userId={resetDialog.userId}
        userName={resetDialog.userName}
      />
    </>
  );
}
