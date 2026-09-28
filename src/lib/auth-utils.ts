import { auth } from "@/lib/auth";
import type { UserRole } from "@/types";

/**
 * Server-side session types
 */
export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  clubId: string;
  clubName: string;
  clubSlug: string;
  parentId: string | null;
}

/**
 * Get the authenticated session on the server side.
 * Throws an error if the user is not authenticated.
 */
export async function getRequiredSession(): Promise<AuthSession> {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Não autenticado. Faça login novamente.");
  }

  const user = session.user as unknown as Record<string, unknown>;

  return {
    userId: user.id as string,
    email: user.email as string,
    name: user.name as string,
    role: user.role as UserRole,
    clubId: user.clubId as string,
    clubName: user.clubName as string,
    clubSlug: user.clubSlug as string,
    parentId: (user.parentId as string) ?? null,
  };
}

/**
 * Check if the authenticated user has one of the allowed roles.
 * Throws an error if not authorized.
 */
export async function requireRole(
  ...allowedRoles: UserRole[]
): Promise<AuthSession> {
  const session = await getRequiredSession();

  // SUPER_ADMIN always has access
  if (session.role === "SUPER_ADMIN") {
    return session;
  }

  if (!allowedRoles.includes(session.role)) {
    throw new Error(
      `Acesso negado. Papel necessário: ${allowedRoles.join(", ")}.`
    );
  }

  return session;
}

/**
 * Check if the authenticated user is a DIRETOR or SUPER_ADMIN.
 */
export async function requireDiretor(): Promise<AuthSession> {
  return requireRole("DIRETOR");
}

/**
 * Check if the authenticated user is at least a PRECEPTOR (PRECEPTOR, DIRETOR, or SUPER_ADMIN).
 */
export async function requirePreceptor(): Promise<AuthSession> {
  return requireRole("DIRETOR", "PRECEPTOR");
}

/**
 * Check if the authenticated user is at least a MONITOR.
 */
export async function requireMonitor(): Promise<AuthSession> {
  return requireRole("DIRETOR", "PRECEPTOR", "MONITOR");
}

/**
 * Get the club-scoped where clause for Prisma queries.
 * Automatically filters by the authenticated user's clubId.
 * This is the core of tenant isolation.
 */
export async function getClubScope(): Promise<{ clubId: string }> {
  const session = await getRequiredSession();
  return { clubId: session.clubId };
}

/**
 * Server Action result wrapper for consistent error handling.
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Wraps a server action with authentication and error handling.
 */
export async function withAuth<T>(
  fn: (session: AuthSession) => Promise<T>
): Promise<ActionResult<T>> {
  try {
    const session = await getRequiredSession();
    const data = await fn(session);
    return { success: true, data };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro inesperado.";
    return { success: false, error: message };
  }
}

/**
 * Wraps a server action with role check and error handling.
 */
export async function withRole<T>(
  roles: UserRole[],
  fn: (session: AuthSession) => Promise<T>
): Promise<ActionResult<T>> {
  try {
    const session = await requireRole(...roles);
    const data = await fn(session);
    return { success: true, data };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro inesperado.";
    return { success: false, error: message };
  }
}

/**
 * Get the parent profile for the authenticated user.
 * Works for any role — checks parentId from session instead of requiring PAI role.
 * Returns the parentId and the list of children member IDs.
 */
export interface ParentContext {
  session: AuthSession;
  parentId: string;
  childrenIds: string[];
}

export async function getParentContext(): Promise<ParentContext> {
  const { prisma } = await import("@/lib/prisma");
  const session = await getRequiredSession();

  if (!session.parentId) {
    throw new Error(
      "Seu cadastro ainda não foi vinculado a nenhum sócio. " +
      "Entre em contato com a direção do clube para que registrem seus filhos " +
      "usando o mesmo e-mail com o qual você se cadastrou."
    );
  }

  const parent = await prisma.parent.findUnique({
    where: { userId: session.userId },
    select: {
      id: true,
      memberParents: {
        where: { member: { clubId: session.clubId } },
        select: { memberId: true },
      },
    },
  });

  if (!parent) {
    throw new Error(
      "Seu cadastro ainda não foi vinculado a nenhum sócio. " +
      "Entre em contato com a direção do clube para que registrem seus filhos " +
      "usando o mesmo e-mail com o qual você se cadastrou."
    );
  }

  return {
    session,
    parentId: parent.id,
    childrenIds: parent.memberParents.map((mp) => mp.memberId),
  };
}
