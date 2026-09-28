import { Suspense } from "react";
import { getRequiredSession } from "@/lib/auth-utils";
import { getStudyHours } from "@/modules/study-hours/queries/get-study-hours";
import { getMembersForStudyHours } from "@/modules/study-hours/queries/get-members-for-study-hours";
import { getChildrenStudyHours } from "@/modules/parents/queries/get-children-study-hours";
import { getParentChildren } from "@/modules/parents/queries/get-parent-children";
import { HorasEstudoView } from "@/modules/study-hours/components/horas-estudo-view";
import { Skeleton } from "@/components/ui/skeleton";

export default function HorasEstudoPage() {
  return (
    <Suspense fallback={<HorasEstudoSkeleton />}>
      <HorasEstudoContent />
    </Suspense>
  );
}

async function HorasEstudoContent() {
  const session = await getRequiredSession();
  const currentYear = new Date().getFullYear();

  if (session.role === "USUARIO" && session.parentId) {
    const [bimestres, children] = await Promise.all([
      getChildrenStudyHours(currentYear),
      getParentChildren(),
    ]);

    const members = children.map((c) => ({
      id: c.id,
      fullName: c.fullName,
    }));

    return <HorasEstudoView bimestres={bimestres} members={members} />;
  }

  const [bimestres, members] = await Promise.all([
    getStudyHours(currentYear),
    getMembersForStudyHours(),
  ]);
  return <HorasEstudoView bimestres={bimestres} members={members} />;
}

function HorasEstudoSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-2 h-5 w-96" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}
