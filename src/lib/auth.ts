import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { extractTenantSlug } from "@/lib/tenant";
import { loginLimiter } from "@/lib/rate-limit";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials, request) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const email = credentials.email as string;
          const password = credentials.password as string;

          // Rate limiting check
          if (!loginLimiter.check(email)) {
            throw new Error(
              "Muitas tentativas de login. Aguarde 15 minutos antes de tentar novamente."
            );
          }

          // Tenant scoping: if the request came in on a tenant subdomain,
          // only consider users belonging to that club. Defense against
          // using one tenant's credentials on another tenant's URL.
          const host =
            (request as Request | undefined)?.headers?.get("host") ?? null;
          const tenantSlug = extractTenantSlug(host);

          const users = await prisma.user.findMany({
            where: {
              email,
              isActive: true,
              club: {
                isActive: true,
                ...(tenantSlug ? { slug: tenantSlug } : {}),
              },
            },
            include: {
              club: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          });

          // Check password against each matching user
          let user: (typeof users)[number] | null = null;
          for (const candidate of users) {
            const valid = await compare(password, candidate.passwordHash);
            if (valid) {
              user = candidate;
              break;
            }
          }

          if (!user) {
            return null;
          }

          // Check if user has a linked Parent record
          const parent = await prisma.parent.findUnique({
            where: { userId: user.id },
            select: { id: true },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            clubId: user.clubId,
            clubName: user.club.name,
            clubSlug: user.club.slug,
            parentId: parent?.id ?? null,
          };
        } catch (error) {
          console.error("[auth] authorize error:", error);
          throw new Error("Erro ao conectar com o banco de dados. Tente novamente.");
        }
      },
    }),
  ],
  trustHost: true,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.clubId = user.clubId;
        token.clubName = user.clubName;
        token.clubSlug = user.clubSlug;
        token.parentId = user.parentId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const s = session.user as unknown as Record<string, unknown>;
        s.id = token.id;
        s.role = token.role;
        s.clubId = token.clubId;
        s.clubName = token.clubName;
        s.clubSlug = token.clubSlug;
        s.parentId = token.parentId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 28800, // 8 hours (in seconds)
  },
});
