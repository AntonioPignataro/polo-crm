import { Suspense } from "react";
import { NovoSocioForm } from "@/modules/members/components/novo-socio-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function NovoSocioPage() {
  return (
    <Suspense fallback={<NovoSocioSkeleton />}>
      <NovoSocioForm />
    </Suspense>
  );
}

function NovoSocioSkeleton() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-10 rounded" />
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="mt-1 h-5 w-72" />
        </div>
      </div>
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
