import { Suspense } from "react";
import { getNotifications } from "@/modules/notifications/queries/get-notifications";
import { getNotificationStats } from "@/modules/notifications/queries/get-notification-stats";
import { getUsersForNotificationGrouped } from "@/modules/notifications/queries/get-users-for-notification";
import { NotificacoesView } from "@/modules/notifications/components/notificacoes-view";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotificacoesPage() {
  return (
    <Suspense fallback={<NotificacoesSkeleton />}>
      <NotificacoesContent />
    </Suspense>
  );
}

async function NotificacoesContent() {
  const [notifications, stats, userGroups] = await Promise.all([
    getNotifications(),
    getNotificationStats(),
    getUsersForNotificationGrouped(),
  ]);

  return (
    <NotificacoesView
      notifications={notifications}
      stats={stats}
      users={userGroups.all}
      userGroups={userGroups}
    />
  );
}

function NotificacoesSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-2 h-5 w-96" />
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}
