"use client";

import { useState } from "react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import { FileSignature, CheckCircle2, Clock } from "lucide-react";
import {
  parseSignatures,
  type SignerInfo,
} from "@/modules/members/lib/signatures";
import type { ParentRelationship } from "@/types";

interface SignatureViewDialogProps {
  memberName: string;
  enrollmentFormUrl: string | null;
  signers: SignerInfo[];
  children: React.ReactNode;
}

const RELATIONSHIP_LABELS: Record<ParentRelationship, string> = {
  PAI: "Pai",
  MAE: "Mãe",
  RESPONSAVEL: "Responsável",
};

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SignatureViewDialog({
  memberName,
  enrollmentFormUrl,
  signers,
  children,
}: SignatureViewDialogProps) {
  const [open, setOpen] = useState(false);

  const signatures = parseSignatures(enrollmentFormUrl);
  const signedCount = signers.filter((s) => s.hasSigned).length;

  // Nothing to show if no one has signed yet — render the trigger inert.
  if (signedCount === 0) {
    return <>{children}</>;
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {children}
      </div>
      <ResponsiveDialogContent className="max-h-[85vh] overflow-y-auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <FileSignature className="size-5 text-green-600" />
            Assinaturas — {memberName}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {signedCount} de {signers.length}{" "}
            {signers.length === 1 ? "responsável assinou" : "responsáveis assinaram"}.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-4">
          {signers.map((signer) => {
            const entry = signatures[signer.parentId];
            return (
              <div
                key={signer.parentId}
                className="rounded-md border p-3 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm">
                    <p className="font-medium">{signer.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {RELATIONSHIP_LABELS[signer.relationship] ?? signer.relationship}
                    </p>
                  </div>
                  {signer.hasSigned ? (
                    <Badge className="bg-green-600 text-white">
                      <CheckCircle2 className="mr-1 size-3" />
                      Assinou
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-muted-foreground">
                      <Clock className="mr-1 size-3" />
                      Pendente
                    </Badge>
                  )}
                </div>

                {signer.hasSigned && entry && (
                  <div className="space-y-3">
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CPF:</span>
                        <span className="font-medium">{entry.signerCpf || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Parentesco:</span>
                        <span className="font-medium">
                          {entry.signerRelationship || "-"}
                        </span>
                      </div>
                      {entry.signedAt && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Data:</span>
                          <span className="font-medium">
                            {formatDate(entry.signedAt)}
                          </span>
                        </div>
                      )}
                    </div>
                    {entry.signature && (
                      <div className="rounded-md border bg-white p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={entry.signature}
                          alt={`Assinatura de ${signer.fullName}`}
                          className="mx-auto max-h-40 w-auto"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
