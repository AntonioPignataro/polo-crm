"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { navigation } from "@/lib/navigation";

// Build a lookup from href to title for breadcrumb display
function getPageTitle(pathname: string): string {
  for (const group of navigation) {
    for (const item of group.items) {
      if (item.href === pathname) {
        return item.title;
      }
    }
  }
  if (pathname.startsWith("/socios/")) return "Sócios";
  return "Dashboard";
}

export function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const pageTitle = getPageTitle(pathname);
  const clubName = (session?.user as Record<string, unknown>)?.clubName as string | undefined;

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex flex-1 items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold">{pageTitle}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {clubName ?? ""}
          </span>
        </div>
      </div>
    </header>
  );
}
