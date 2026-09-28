import type { UserRole } from "@/generated/prisma/client";

declare module "next-auth" {
  interface User {
    id: string;
    role: UserRole;
    clubId: string;
    clubName: string;
    clubSlug: string;
    parentId: string | null;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
      clubId: string;
      clubName: string;
      clubSlug: string;
      parentId: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    clubId: string;
    clubName: string;
    clubSlug: string;
    parentId: string | null;
  }
}
