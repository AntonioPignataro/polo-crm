"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from "@/components/ui/responsive-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { assignMemberToPreceptor } from "@/modules/preceptors/actions/assign-member";
import type { UnassignedMember } from "@/modules/preceptors/queries/get-unassigned-members";

interface AssignMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preceptorId: string;
  preceptorName: string;
  unassignedMembers: UnassignedMember[];
}

function getInitials(name: string): string {
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AssignMemberDialog({
  open,
  onOpenChange,
  preceptorId,
  preceptorName,
  unassignedMembers,
}: AssignMemberDialogProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const filtered = unassignedMembers.filter((m) =>
    m.fullName.toLowerCase().includes(search.toLowerCase())
  );

  function handleAssign(memberId: string) {
    setAssigningId(memberId);
    startTransition(async () => {
      const result = await assignMemberToPreceptor(memberId, preceptorId);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
      setAssigningId(null);
    });
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setSearch("");
        onOpenChange(v);
      }}
    >
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5" />
            Adicionar Preceptorado
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Selecione um sócio para atribuir a {preceptorName}.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {/* Search */}
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar sócio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Members list */}
        <div className="mt-3 max-h-[300px] space-y-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {unassignedMembers.length === 0
                ? "Todos os sócios já estão atribuídos."
                : "Nenhum sócio encontrado."}
            </p>
          ) : (
            filtered.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="size-7">
                    <AvatarFallback className="text-[10px]">
                      {getInitials(member.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {member.fullName}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 min-h-[44px] min-w-[44px]"
                  disabled={isPending}
                  onClick={() => handleAssign(member.id)}
                >
                  {assigningId === member.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  <span className="sr-only">Adicionar {member.fullName}</span>
                </Button>
              </div>
            ))
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
