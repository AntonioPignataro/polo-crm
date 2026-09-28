"use client";

import { useEffect, useState, useTransition } from "react";
import { Car, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import {
  getActivityRegistrations,
  type ActivityRegistrationItem,
} from "@/modules/activities/queries/get-activity-registrations";
import { registerExternalParticipant } from "@/modules/activities/actions/register-external-participant";

interface ActivityParticipantsViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityId: string;
  activityName: string;
}

export function ActivityParticipantsView({
  open,
  onOpenChange,
  activityId,
  activityName,
}: ActivityParticipantsViewProps) {
  const [registrations, setRegistrations] = useState<ActivityRegistrationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [externalName, setExternalName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    setExternalName("");

    getActivityRegistrations(activityId)
      .then((data) => {
        setRegistrations(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Erro ao carregar inscritos.");
        setLoading(false);
      });
  }, [open, activityId]);

  function handleAddExternal() {
    if (!externalName.trim()) return;

    startTransition(async () => {
      const result = await registerExternalParticipant({
        activityId,
        participantName: externalName.trim(),
      });

      if (result.success) {
        setExternalName("");
        // Refresh the list
        const updated = await getActivityRegistrations(activityId);
        setRegistrations(updated);
      } else {
        setError(result.error);
      }
    });
  }

  const rideGivers = registrations.filter((r) => r.canGiveRide).length;
  const rideNeeders = registrations.filter((r) => r.needsRide).length;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Inscritos na Atividade</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {activityName} — {registrations.length} inscrito(s)
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <>
              {/* Ride summary */}
              {(rideGivers > 0 || rideNeeders > 0) && (
                <div className="flex gap-4 text-sm">
                  {rideGivers > 0 && (
                    <div className="flex items-center gap-1 text-green-700">
                      <Car className="size-4" />
                      <span>{rideGivers} pode(m) dar carona</span>
                    </div>
                  )}
                  {rideNeeders > 0 && (
                    <div className="flex items-center gap-1 text-orange-600">
                      <Car className="size-4" />
                      <span>{rideNeeders} precisa(m) de carona</span>
                    </div>
                  )}
                </div>
              )}

              {/* Participants list */}
              {registrations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhum inscrito ainda.
                </p>
              ) : (
                <ul className="space-y-2">
                  {registrations.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-2 text-sm rounded-md border p-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-primary shrink-0" />
                        <span>{r.participantName}</span>
                        {r.isExternal && (
                          <Badge variant="outline" className="text-xs">
                            Externo
                          </Badge>
                        )}
                        {r.isParent && (
                          <Badge variant="outline" className="text-xs">
                            Pai/Resp.
                          </Badge>
                        )}
                        {r.isStaff && (
                          <Badge variant="outline" className="text-xs">
                            Equipe
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {r.canGiveRide && (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                            Carona
                          </Badge>
                        )}
                        {r.needsRide && (
                          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 text-xs">
                            Precisa carona
                          </Badge>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Add external participant form */}
              <div className="border-t pt-4 space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <UserPlus className="size-4" />
                  Adicionar participante externo
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome do participante"
                    value={externalName}
                    onChange={(e) => setExternalName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddExternal();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={handleAddExternal}
                    disabled={isPending || !externalName.trim()}
                  >
                    {isPending ? "..." : "Adicionar"}
                  </Button>
                </div>
              </div>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
