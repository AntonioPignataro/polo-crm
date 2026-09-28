import { Suspense } from "react";
import { getAppointments } from "@/modules/appointments/queries/get-appointments";
import { getMembersForAppointment } from "@/modules/appointments/queries/get-members-for-appointment";
import { AtendimentosView } from "@/modules/appointments/components/atendimentos-view";
import { Skeleton } from "@/components/ui/skeleton";

export default function AtendimentosPage() {
  return (
    <Suspense fallback={<AtendimentosSkeleton />}>
      <AtendimentosContent />
    </Suspense>
  );
}

async function AtendimentosContent() {
  const [appointments, membersData] = await Promise.all([
    getAppointments(),
    getMembersForAppointment(),
  ]);

  return (
    <AtendimentosView
      appointments={appointments}
      allMembers={membersData.allMembers}
      assignedMembers={membersData.assignedMembers}
      userRole={membersData.userRole}
      currentUserId={membersData.userId}
    />
  );
}

function AtendimentosSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-2 h-5 w-96" />
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}
