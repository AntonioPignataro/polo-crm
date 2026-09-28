import type {
  UserRole,
  GroupType,
  ModuleType,
  MemberStatus,
  PolarCategory,
  BookStatus,
  BookCategory,
  AppointmentType,
  ActivityStatus,
  FormationType,
  CalendarEventType,
  CalendarChangeType,
  NotificationType,
  ParentRelationship,
  Sex,
} from "@/generated/prisma/client";

export type {
  UserRole,
  GroupType,
  ModuleType,
  MemberStatus,
  PolarCategory,
  BookStatus,
  BookCategory,
  AppointmentType,
  ActivityStatus,
  FormationType,
  CalendarEventType,
  CalendarChangeType,
  NotificationType,
  ParentRelationship,
  Sex,
};

// Navigation types
export interface NavItem {
  title: string;
  href: string;
  icon: string;
  roles: UserRole[];
  parentOnly?: boolean;
  parentAllowed?: boolean;
  children?: NavItem[];
}

// Common table/list types
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Dashboard stats
export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  attendanceRate: number;
  topPolarMembers: {
    id: string;
    name: string;
    totalPolares: number;
  }[];
  upcomingActivities: {
    id: string;
    name: string;
    date: string;
  }[];
  pendingAlerts: number;
}
