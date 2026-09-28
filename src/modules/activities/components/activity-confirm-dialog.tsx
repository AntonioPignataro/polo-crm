"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { getParentActivityData, type ParentActivityOption } from "@/modules/activities/queries/get-parent-activity-data";
import { confirmActivityPresence } from "@/modules/activities/actions/confirm-activity-presence";

interface ActivityConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityId: string;
  activityName: string;
  parentId: string;
  userId: string;
}

export function ActivityConfirmDialog({
  open,
  onOpenChange,
  activityId,
  activityName,
  parentId,
}: ActivityConfirmDialogProps) {
  const [options, setOptions] = useState<ParentActivityOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [canGiveRide, setCanGiveRide] = useState(false);
  const [needsRide, setNeedsRide] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch options when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    setSuccess("");
    setSelectedIds(new Set());
    setCanGiveRide(false);
    setNeedsRide(false);

    getParentActivityData(parentId).then((data) => {
      setOptions(data.options);
      setLoading(false);
    }).catch(() => {
      setError("Erro ao carregar dados.");
      setLoading(false);
    });
  }, [open, parentId]);

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleConfirm() {
    const memberIds: string[] = [];
    let selectedParentId: string | null = null;

    for (const opt of options) {
      if (!selectedIds.has(opt.id)) continue;
      if (opt.type === "member") {
        memberIds.push(opt.id);
      } else {
        selectedParentId = opt.id;
      }
    }

    if (memberIds.length === 0 && !selectedParentId) {
      setError("Selecione pelo menos uma pessoa.");
      return;
    }

    startTransition(async () => {
      const result = await confirmActivityPresence({
        activityId,
        selectedMemberIds: memberIds,
        selectedParentId,
        canGiveRide,
        needsRide,
      });

      if (result.success) {
        setSuccess(`Presença confirmada para ${result.data.count} pessoa(s)!`);
        setError("");
        setTimeout(() => {
          onOpenChange(false);
          window.location.reload();
        }, 1000);
      } else {
        setError(result.error);
        setSuccess("");
      }
    });
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Confirmar presença</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Selecione quem participará de: {activityName}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : options.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum participante disponível para inscrição.
            </p>
          ) : (
            <>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Participantes</Label>
                {options.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-3">
                    <Checkbox
                      id={`opt-${opt.id}`}
                      checked={selectedIds.has(opt.id)}
                      onCheckedChange={() => toggleSelection(opt.id)}
                    />
                    <Label
                      htmlFor={`opt-${opt.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {opt.fullName}
                    </Label>
                  </div>
                ))}
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="canGiveRide"
                    checked={canGiveRide}
                    onCheckedChange={(v) => setCanGiveRide(v === true)}
                  />
                  <Label
                    htmlFor="canGiveRide"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Posso dar carona
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="needsRide"
                    checked={needsRide}
                    onCheckedChange={(v) => setNeedsRide(v === true)}
                  />
                  <Label
                    htmlFor="needsRide"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Preciso de carona
                  </Label>
                </div>
              </div>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}
        </div>

        <ResponsiveDialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending || selectedIds.size === 0}
          >
            {isPending ? "Confirmando..." : "Confirmar"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
