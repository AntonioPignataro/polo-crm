import { Suspense } from "react";
import { getRequiredSession } from "@/lib/auth-utils";
import { getActivities } from "@/modules/activities/queries/get-activities";
import { AtividadesView } from "@/modules/activities/components/atividades-view";
import { Skeleton } from "@/components/ui/skeleton";

export default function AtividadesPage() {
  return (
    <Suspense fallback={<AtividadesSkeleton />}>
      <AtividadesContent />
    </Suspense>
  );
}

async function AtividadesContent() {
  const session = await getRequiredSession();
  const activities = await getActivities();

  const isParent = !!session.parentId;
  const isUsuario = session.role === "USUARIO";
  const isMonitorPlus = ["MONITOR", "PRECEPTOR", "DIRETOR", "SUPER_ADMIN"].includes(
    session.role
  );
  const canEditActivities = ["PRECEPTOR", "DIRETOR", "SUPER_ADMIN"].includes(
    session.role
  );

  return (
    <AtividadesView
      activities={activities}
      isParent={isParent}
      isUsuario={isUsuario}
      isMonitorPlus={isMonitorPlus}
      canEditActivities={canEditActivities}
      sessionParentId={session.parentId}
      sessionUserId={session.userId}
    />
  );
}

function AtividadesSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-2 h-5 w-96" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    </div>
  );
}
