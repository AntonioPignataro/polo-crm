import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { extractTenantSlug, isProductionApex } from "@/lib/tenant";

const publicRoutes = [
  "/login",
  "/register",
  "/api/auth",
  // Vercel Cron sends no session cookie; each handler checks CRON_SECRET itself.
  "/api/cron",
  "/select-club",
  "/esqueci-senha",
  "/redefinir-senha",
];

/**
 * Routes that USUARIO (parent) users are allowed to access.
 * All other dashboard routes redirect to /dashboard.
 */
const parentAllowedRoutes = [
  "/dashboard",
  "/meus-filhos",
  "/calendario",
  "/polares",
  "/atividades",
  "/formacao-pais",
  "/horas-estudo",
  "/documentos",
  "/manual-clube-polo-1-semestre-2026.pdf",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host");
  const tenantSlug = extractTenantSlug(host);

  // Apex landing: production sistemapolo.com (no subdomain) routes everything
  // except /select-club + /api to the club selector. Local dev / preview hosts
  // (no slug, not apex) fall through to existing behavior — fallback to first
  // active club downstream.
  if (
    !tenantSlug &&
    isProductionApex(host) &&
    !pathname.startsWith("/select-club") &&
    !pathname.startsWith("/api/")
  ) {
    return NextResponse.redirect(
      new URL("/select-club", request.nextUrl.origin)
    );
  }

  // Forward tenant context to server actions / route handlers via request header.
  const forwardHeaders = new Headers(request.headers);
  if (tenantSlug) forwardHeaders.set("x-tenant-slug", tenantSlug);

  // Allow public routes
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
  if (isPublicRoute) {
    return NextResponse.next({ request: { headers: forwardHeaders } });
  }

  // Use getToken() to decrypt the JWE session token (Edge-safe, no Prisma needed)
  const isSecure = request.nextUrl.protocol === "https:";
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: isSecure,
  });

  // Redirect unauthenticated users to login
  if (!token) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as string | undefined;
  const parentId = token.parentId as string | null | undefined;

  // USUARIO users — restrict routes based on parent status
  if (role === "USUARIO") {
    // USUARIO without parentId: only allow /dashboard (pending access screen)
    if (!parentId) {
      if (pathname !== "/dashboard" && !pathname.startsWith("/api/")) {
        const dashboardUrl = new URL("/dashboard", request.nextUrl.origin);
        return NextResponse.redirect(dashboardUrl);
      }
      return NextResponse.next({ request: { headers: forwardHeaders } });
    }

    // USUARIO with parentId: restrict to parent-allowed routes
    const isAllowed = parentAllowedRoutes.some(
      (route) => pathname === route || pathname.startsWith(route + "/")
    );

    // Allow API routes (protected at the action level by auth-utils)
    const isApiRoute = pathname.startsWith("/api/");

    if (!isAllowed && !isApiRoute) {
      const dashboardUrl = new URL("/dashboard", request.nextUrl.origin);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next({ request: { headers: forwardHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
