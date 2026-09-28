import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-utils";
import type { UserRole } from "@/types";

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

export async function getUsers(): Promise<UserListItem[]> {
  const session = await requireRole("DIRETOR");

  const users = await prisma.user.findMany({
    where: {
      clubId: session.clubId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: [{ name: "asc" }],
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as UserRole,
    phone: u.phone,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString().split("T")[0],
  }));
}
