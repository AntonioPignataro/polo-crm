import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getRequiredSession } from "@/lib/auth-utils";
import { getChildrenPolares } from "@/modules/parents/queries/get-children-polares";
import { MeusFilhosView } from "@/modules/parents/components/meus-filhos-view";
import { Skeleton } from "@/components/ui/skeleton";

export default function MeusFilhosPage() {
  return (
    <Suspense fallback={<MeusFilhosSkeleton />}>
      <MeusFilhosContent />
    </Suspense>
  );
}

async function MeusFilhosContent() {
  const session = await getRequiredSession();

  if (!session.parentId) {
    redirect("/dashboard");
  }

  const filhos = await getChildrenPolares();
  return <MeusFilhosView filhos={filhos} />;
}

function MeusFilhosSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-5 w-80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-[300px] w-full" />
    </div>
  );
}
