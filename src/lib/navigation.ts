import type { UserRole } from "@/types";

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  roles: UserRole[];
  parentOnly?: boolean;
  parentAllowed?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navigation: NavGroup[] = [
  {
    label: "Geral",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: "LayoutDashboard",
        roles: ["SUPER_ADMIN", "DIRETOR", "PRECEPTOR", "MONITOR", "USUARIO"],
        parentAllowed: true,
      },
      {
        title: "Calendário",
        href: "/calendario",
        icon: "Calendar",
        roles: ["SUPER_ADMIN", "DIRETOR", "PRECEPTOR", "MONITOR", "USUARIO"],
        parentAllowed: true,
      },
      {
        title: "Documentos",
        href: "/documentos",
        icon: "FileText",
        roles: ["SUPER_ADMIN", "DIRETOR", "PRECEPTOR", "MONITOR", "USUARIO"],
        parentAllowed: true,
      },
    ],
  },
  {
    label: "Minha Família",
    items: [
      {
        title: "Meus Filhos",
        href: "/meus-filhos",
        icon: "Heart",
        roles: ["SUPER_ADMIN", "DIRETOR", "PRECEPTOR", "MONITOR", "USUARIO"],
        parentOnly: true,
        parentAllowed: true,
      },
    ],
  },
  {
    label: "Gestão",
    items: [
      {
        title: "Sócios",
        href: "/socios",
        icon: "Users",
        roles: ["SUPER_ADMIN", "DIRETOR", "PRECEPTOR", "MONITOR"],
      },
      {
        title: "Histórico",
        href: "/socios/historico",
        icon: "History",
        roles: ["SUPER_ADMIN", "DIRETOR"],
      },
      {
        title: "Preceptores",
        href: "/preceptores",
        icon: "UserCheck",
        roles: ["SUPER_ADMIN", "DIRETOR"],
      },
      {
        title: "Polares",
        href: "/polares",
        icon: "Star",
        roles: ["SUPER_ADMIN", "DIRETOR", "PRECEPTOR", "MONITOR", "USUARIO"],
        parentAllowed: true,
      },
      {
        title: "Presença",
        href: "/presenca",
        icon: "ClipboardCheck",
        roles: ["SUPER_ADMIN", "DIRETOR", "PRECEPTOR", "MONITOR"],
      },
      {
        title: "Usuários",
        href: "/usuarios",
        icon: "ShieldCheck",
        roles: ["SUPER_ADMIN", "DIRETOR"],
      },
    ],
  },
  {
    label: "Atividades",
    items: [
      {
        title: "Atividades",
        href: "/atividades",
        icon: "Mountain",
        roles: ["SUPER_ADMIN", "DIRETOR", "PRECEPTOR", "MONITOR", "USUARIO"],
        parentAllowed: true,
      },
      {
        title: "Formação Pais",
        href: "/formacao-pais",
        icon: "GraduationCap",
        roles: ["SUPER_ADMIN", "DIRETOR", "PRECEPTOR", "USUARIO"],
        parentAllowed: true,
      },
      {
        title: "Atendimentos",
        href: "/atendimentos",
        icon: "MessageSquare",
        roles: ["SUPER_ADMIN", "DIRETOR", "PRECEPTOR"],
      },
    ],
  },
  {
    label: "Recursos",
    items: [
      {
        title: "Biblioteca",
        href: "/biblioteca",
        icon: "BookOpen",
        roles: ["SUPER_ADMIN", "DIRETOR", "PRECEPTOR", "MONITOR"],
      },
      {
        title: "Horas de Estudo",
        href: "/horas-estudo",
        icon: "Clock",
        roles: ["SUPER_ADMIN", "DIRETOR", "PRECEPTOR", "MONITOR", "USUARIO"],
        parentAllowed: true,
      },
    ],
  },
  {
    label: "Comunicação",
    items: [
      {
        title: "Notificações",
        href: "/notificacoes",
        icon: "Bell",
        roles: ["SUPER_ADMIN", "DIRETOR"],
      },
    ],
  },
  {
    label: "Relatórios",
    items: [
      {
        title: "Relatórios",
        href: "/relatorios",
        icon: "BarChart3",
        roles: ["SUPER_ADMIN", "DIRETOR", "PRECEPTOR", "MONITOR"],
      },
    ],
  },
];
