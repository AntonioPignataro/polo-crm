import { Suspense } from "react";
import { requireMonitor } from "@/lib/auth-utils";
import { getReportSummary } from "@/modules/reports/queries/get-report-data";
import { RelatoriosView } from "@/modules/reports/components/relatorios-view";
import { getMembersForAppointment } from "@/modules/appointments/queries/get-members-for-appointment";
import { listManagedFiles } from "@/modules/documentos/queries/get-documentos";
import { DocumentosManager } from "@/modules/documentos/components/documentos-manager";
import { Skeleton } from "@/components/ui/skeleton";

export default function RelatoriosPage() {
  return (
    <Suspense fallback={<RelatoriosSkeleton />}>
      <RelatoriosContent />
    </Suspense>
  );
}

async function RelatoriosContent() {
  // Block PAI from accessing Relatórios (requires MONITOR or higher)
  await requireMonitor();
  const [summary, files, membersData] = await Promise.all([
    getReportSummary(),
    listManagedFiles(),
    getMembersForAppointment(),
  ]);
  return (
    <div className="space-y-6">
      <RelatoriosView summary={summary} members={membersData.allMembers} />
      <DocumentosManager files={files} />
    </div>
  );
}

function RelatoriosSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-2 h-5 w-96" />
      </div>
      <Skeleton className="h-32 w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    </div>
  );
}
