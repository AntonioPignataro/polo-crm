import { Suspense } from "react";
import { getRequiredSession } from "@/lib/auth-utils";
import { listVisibleDocuments } from "@/modules/documentos/queries/get-documentos";
import { DocumentosView } from "@/modules/documentos/components/documentos-view";
import { Skeleton } from "@/components/ui/skeleton";

export default function DocumentosPage() {
  return (
    <Suspense fallback={<DocumentosSkeleton />}>
      <DocumentosContent />
    </Suspense>
  );
}

async function DocumentosContent() {
  // Any authenticated user, including parents (USUARIO).
  await getRequiredSession();
  const files = await listVisibleDocuments();
  return <DocumentosView files={files} />;
}

function DocumentosSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
