import { Suspense } from "react";
import { getRequiredSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { getFormations } from "@/modules/reports/queries/get-formations";
import { FormacaoPaisView } from "@/modules/reports/components/formacao-pais-view";
import { Skeleton } from "@/components/ui/skeleton";

export default function FormacaoPaisPage() {
  return (
    <Suspense fallback={<FormacaoSkeleton />}>
      <FormacaoContent />
    </Suspense>
  );
}

async function FormacaoContent() {
  const session = await getRequiredSession();
  const formations = await getFormations();

  const isParent = !!session.parentId;
  const isUsuario = session.role === "USUARIO";
  const canEditFormations = ["DIRETOR", "SUPER_ADMIN"].includes(session.role);
  const canMarkAttendance = ["MONITOR", "PRECEPTOR", "DIRETOR", "SUPER_ADMIN"].includes(
    session.role
  );

  // Get parent sex/relationship if applicable
  let parentSex: string | null = null;
  let parentRelationship: string | null = null;

  if (isParent) {
    const parent = await prisma.parent.findUnique({
      where: { userId: session.userId },
      select: { sex: true, relationship: true },
    });
    if (parent) {
      parentSex = parent.sex;
      parentRelationship = parent.relationship;
    }
  }

  return (
    <FormacaoPaisView
      formations={formations}
      isParent={isParent}
      isUsuario={isUsuario}
      canEditFormations={canEditFormations}
      canMarkAttendance={canMarkAttendance}
      parentSex={parentSex}
      parentRelationship={parentRelationship}
      sessionParentId={session.parentId}
    />
  );
}

function FormacaoSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-2 h-5 w-96" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}
