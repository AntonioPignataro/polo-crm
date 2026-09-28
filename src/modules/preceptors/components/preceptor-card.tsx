"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Phone, Mail, Plus, X, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardTitle,
  CardHeader,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { MODULE_LABELS } from "@/lib/constants";
import { assignMemberToPreceptor } from "@/modules/preceptors/actions/assign-member";
import { AssignMemberDialog } from "./assign-member-dialog";
import type { PreceptorWithMembers } from "../queries/get-preceptors-with-members";
import type { UnassignedMember } from "../queries/get-unassigned-members";
import type { GroupType, ModuleType } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function grupoBadgeClass(grupo: GroupType): string {
  switch (grupo) {
    case "G1":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    case "G2":
      return "bg-green-100 text-green-800 hover:bg-green-100";
    case "G3":
      return "bg-purple-100 text-purple-800 hover:bg-purple-100";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PreceptorCardProps {
  preceptor: PreceptorWithMembers;
  unassignedMembers: UnassignedMember[];
  canManage: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PreceptorCard({
  preceptor,
  unassignedMembers,
  canManage,
}: PreceptorCardProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);

  function handleUnassign(memberId: string, memberName: string) {
    if (
      !window.confirm(
        `Remover ${memberName} dos preceptorados de ${preceptor.name}?`
      )
    ) {
      return;
    }

    setRemovingId(memberId);
    startTransition(async () => {
      const result = await assignMemberToPreceptor(memberId, null);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
      setRemovingId(null);
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="size-12">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                {getInitials(preceptor.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-base">{preceptor.name}</CardTitle>
              <div className="mt-1 space-y-0.5">
                {preceptor.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="size-3" />
                    {preceptor.phone}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="size-3" />
                  {preceptor.email}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              Preceptorados
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {preceptor.members.length} sócios
              </Badge>
              {canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus className="size-3" />
                  Adicionar
                </Button>
              )}
            </div>
          </div>
          {preceptor.members.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhum sócio atribuído.
            </p>
          ) : (
            <ul className="space-y-2">
              {preceptor.members.map((member) => (
                <li
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
                  <div className="flex items-center gap-2">
                    <Badge className={grupoBadgeClass(member.groupType)}>
                      {member.groupType}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {member.modules.map((mod: ModuleType) => MODULE_LABELS[mod] ?? mod).join(", ")}
                    </span>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 min-h-[44px] min-w-[44px] text-muted-foreground hover:text-destructive"
                        disabled={isPending}
                        onClick={() =>
                          handleUnassign(member.id, member.fullName)
                        }
                      >
                        {removingId === member.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <X className="size-3.5" />
                        )}
                        <span className="sr-only">
                          Remover {member.fullName}
                        </span>
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <AssignMemberDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          preceptorId={preceptor.id}
          preceptorName={preceptor.name}
          unassignedMembers={unassignedMembers}
        />
      )}
    </>
  );
}
