"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCheck,
  Star,
  ClipboardCheck,
  Mountain,
  GraduationCap,
  MessageSquare,
  BookOpen,
  Clock,
  BarChart3,
  Heart,
  Bell,
  ShieldCheck,
  History,
  LogOut,
  ChevronsUpDown,
  FileText,
  KeyRound,
} from "lucide-react";

import { navigation } from "@/lib/navigation";
import type { UserRole } from "@/types";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,

} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChangePasswordDialog } from "@/modules/auth/components/change-password-dialog";
import { ROLE_LABELS } from "@/lib/constants";

// Icon lookup mapping string names from navigation config to lucide-react components
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Calendar,
  Users,
  UserCheck,
  Star,
  ClipboardCheck,
  Mountain,
  GraduationCap,
  MessageSquare,
  BookOpen,
  Clock,
  BarChart3,
  Heart,
  Bell,
  ShieldCheck,
  History,
  FileText,
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter((_, i, arr) => i === 0 || i === arr.length - 1)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  const user = session?.user;
  const userName = user?.name ?? "Usuário";
  const userCast = user as Record<string, unknown> | undefined;
  const userRole = userCast?.role as UserRole | undefined;
  const userParentId = userCast?.parentId as string | null | undefined;
  const roleLabel = userRole ? ROLE_LABELS[userRole] : "";
  const userEmail = user?.email ?? "";
  const initials = getInitials(userName);

  return (
    <Sidebar collapsible="icon">
      {/* Branding / Logo */}
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-sidebar-border">
                  <Image
                    src="/logo-star.png"
                    alt="Clube Polo"
                    width={28}
                    height={28}
                    className="object-contain"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold tracking-wider">
                    POLO
                  </span>
                  <span className="truncate text-xs text-sidebar-foreground/60">
                    Sistema Polo
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation Groups */}
      <SidebarContent>
        {navigation.map((group) => {
          // Filter items by user role and parentOnly flag
          const isParentUser = userRole === "USUARIO" && !!userParentId;
          const visibleItems = userRole
            ? group.items.filter((item) => {
                // parentOnly items only show for users with a linked Parent record
                if (item.parentOnly && !userParentId) return false;
                // USUARIO with parentId can only see parentAllowed items
                if (isParentUser && !item.parentAllowed) return false;
                return item.roles.includes(userRole);
              })
            : group.items;

          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => {
                    const Icon = iconMap[item.icon];
                    const isActive = pathname === item.href;

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.title}
                        >
                          <Link href={item.href}>
                            {Icon && <Icon />}
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      {/* User Footer */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{userName}</span>
                    <span className="truncate text-xs text-sidebar-foreground/60">
                      {roleLabel}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{userName}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {userEmail}
                    </span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setPasswordDialogOpen(true)}>
                  <KeyRound />
                  <span>Alterar senha</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                  <LogOut />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Rendered outside the dropdown so closing the menu doesn't unmount it */}
        <ChangePasswordDialog
          open={passwordDialogOpen}
          onOpenChange={setPasswordDialogOpen}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
