import type { UserRole } from "@/types";

export interface BottomNavItem {
  title: string;
  href: string;
  icon: string;
}

/**
 * Role-based bottom nav items (max 4 per role).
 * The 5th slot is always "Mais" (menu) handled by the component.
 */
export const bottomNavConfig: Record<UserRole, BottomNavItem[]> = {
  SUPER_ADMIN: [
    { title: "Início", href: "/dashboard", icon: "LayoutDashboard" },
    { title: "Sócios", href: "/socios", icon: "Users" },
    { title: "Polares", href: "/polares", icon: "Star" },
    { title: "Presença", href: "/presenca", icon: "ClipboardCheck" },
  ],
  DIRETOR: [
    { title: "Início", href: "/dashboard", icon: "LayoutDashboard" },
    { title: "Sócios", href: "/socios", icon: "Users" },
    { title: "Polares", href: "/polares", icon: "Star" },
    { title: "Presença", href: "/presenca", icon: "ClipboardCheck" },
  ],
  PRECEPTOR: [
    { title: "Início", href: "/dashboard", icon: "LayoutDashboard" },
    { title: "Polares", href: "/polares", icon: "Star" },
    { title: "Presença", href: "/presenca", icon: "ClipboardCheck" },
    { title: "Atend.", href: "/atendimentos", icon: "MessageSquare" },
  ],
  MONITOR: [
    { title: "Início", href: "/dashboard", icon: "LayoutDashboard" },
    { title: "Polares", href: "/polares", icon: "Star" },
    { title: "Presença", href: "/presenca", icon: "ClipboardCheck" },
    { title: "Biblioteca", href: "/biblioteca", icon: "BookOpen" },
  ],
  USUARIO: [
    { title: "Início", href: "/dashboard", icon: "LayoutDashboard" },
    { title: "Filhos", href: "/meus-filhos", icon: "Heart" },
    { title: "Polares", href: "/polares", icon: "Star" },
    { title: "Estudo", href: "/horas-estudo", icon: "Clock" },
  ],
};
