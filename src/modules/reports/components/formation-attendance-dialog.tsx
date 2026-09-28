"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import {
  getParentsForFormationAttendance,
  type ParentForFormationAttendance,
} from "@/modules/reports/queries/get-parents-for-formation-attendance";
import { markFormationAttendance } from "@/modules/reports/actions/mark-formation-attendance";

interface FormationAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formationId: string | null;
  formationName: string | null;
}

export function FormationAttendanceDialog({
  open,
  onOpenChange,
  formationId,
  formationName,
}: FormationAttendanceDialogProps) {
  const [parents, setParents] = useState<ParentForFormationAttendance[]>([]);
  const [present, setPresent] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  useEffect(() => {
    if (!open || !formationId) return;

    let cancelled = false;
    setLoading(true);
    setServerError(null);
    getParentsForFormationAttendance(formationId)
      .then((data) => {
        if (cancelled) return;
        setParents(data);
        setPresent(new Map(data.map((p) => [p.parentId, p.present])));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setServerError("Erro ao carregar lista de pais.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, formationId]);

  function togglePresent(parentId: string) {
    setPresent((prev) => {
      const next = new Map(prev);
      next.set(parentId, !next.get(parentId));
      return next;
    });
  }

  function handleSave() {
    if (!formationId) return;
    setServerError(null);
    startSaveTransition(async () => {
      const presences = parents.map((p) => ({
        parentId: p.parentId,
        present: present.get(p.parentId) ?? false,
      }));
      const result = await markFormationAttendance({
        formationId,
        presences,
      });
      if (result.success) {
        onOpenChange(false);
        window.location.reload();
      } else {
        setServerError(result.error);
      }
    });
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Lançar presença</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {formationName
              ? `Marque os pais que compareceram em "${formationName}".`
              : "Marque os pais que compareceram."}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && parents.length === 0 && !serverError && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum pai elegível para esta formação.
          </p>
        )}

        {!loading && parents.length > 0 && (
          <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-1">
            {parents.map((p) => (
              <label
                key={p.parentId}
                className="flex items-center justify-between gap-3 rounded-md border p-2 cursor-pointer hover:bg-muted/50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Checkbox
                    checked={present.get(p.parentId) ?? false}
                    onCheckedChange={() => togglePresent(p.parentId)}
                  />
                  <span className="text-sm truncate">{p.fullName}</span>
                </div>
                {p.confirmed && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    RSVP
                  </Badge>
                )}
              </label>
            ))}
          </div>
        )}

        {serverError && (
          <p className="text-sm text-destructive">{serverError}</p>
        )}

        <ResponsiveDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || loading || parents.length === 0}
          >
            {isSaving ? "Salvando..." : "Salvar presença"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
