"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Star,
  ClipboardCheck,
  MessageSquare,
  BookOpen,
  Clock,
  Mountain,
  Heart,
  Menu,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { bottomNavConfig } from "@/lib/bottom-nav";
import type { UserRole } from "@/types";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Star,
  ClipboardCheck,
  MessageSquare,
  BookOpen,
  Clock,
  Mountain,
  Heart,
};

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { toggleSidebar } = useSidebar();

  const role = session?.user?.role as UserRole | undefined;
  if (!role) return null;

  const items = bottomNavConfig[role] ?? bottomNavConfig.USUARIO;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex h-16 items-center justify-around">
        {items.map((item) => {
          const Icon = iconMap[item.icon] ?? LayoutDashboard;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <Icon className="size-5" />
              <span className="text-[10px] font-medium leading-tight">
                {item.title}
              </span>
            </Link>
          );
        })}

        {/* "Mais" button — opens the sidebar */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-muted-foreground transition-colors"
        >
          <Menu className="size-5" />
          <span className="text-[10px] font-medium leading-tight">Mais</span>
        </button>
      </div>
    </nav>
  );
}
