import { Suspense } from "react";
import { getCalendarEvents } from "@/modules/calendar/queries/get-calendar-events";
import { getRequiredSession } from "@/lib/auth-utils";
import { CalendarioView } from "@/modules/calendar/components/calendario-view";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarioPage() {
  return (
    <Suspense fallback={<CalendarioSkeleton />}>
      <CalendarioContent />
    </Suspense>
  );
}

async function CalendarioContent() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0–11, drives the default calendar view
  const [session, eventsSem1, eventsSem2] = await Promise.all([
    getRequiredSession(),
    getCalendarEvents(`${currentYear}.1`),
    getCalendarEvents(`${currentYear}.2`),
  ]);

  const isParent =
    session.role === "USUARIO" && !!session.parentId;

  return (
    <CalendarioView
      eventsSem1={eventsSem1}
      eventsSem2={eventsSem2}
      year={currentYear}
      initialMonth={currentMonth}
      userRole={session.role}
      isParent={isParent}
    />
  );
}

function CalendarioSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-2 h-5 w-96" />
      </div>
      <Skeleton className="h-[500px] w-full" />
    </div>
  );
}
