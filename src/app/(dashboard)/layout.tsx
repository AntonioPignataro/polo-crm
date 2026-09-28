import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/shared/components/app-sidebar";
import { Header } from "@/shared/components/header";
import { BottomNav } from "@/shared/components/bottom-nav";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PendingAccessScreen } from "@/shared/components/pending-access-screen";
import { getUnsignedChildren } from "@/modules/parents/queries/get-unsigned-children";
import { ParentSignatureScreen } from "@/modules/parents/components/parent-signature-screen";
import { ForcePasswordChangeScreen } from "@/modules/auth/components/force-password-change-screen";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user as Record<string, unknown> | undefined;
  const role = user?.role as string | undefined;
  const userId = user?.id as string | undefined;
  const clubId = user?.clubId as string | undefined;
  const parentId = (user?.parentId as string) ?? null;

  // Temporary-password gate, checked first: if the direction reset this
  // account, replacing the password comes before anything else in the app.
  // Read from the database rather than the JWT so it clears on the very next
  // render, with no stale-session dance.
  if (userId && clubId) {
    const account = await prisma.user.findFirst({
      where: { id: userId, clubId },
      select: { mustChangePassword: true, name: true },
    });

    if (account?.mustChangePassword) {
      return <ForcePasswordChangeScreen userName={account.name} />;
    }
  }

  // USUARIO lockout: a USUARIO with no active children sees the pending screen.
  if (role === "USUARIO" && userId && clubId) {
    const parent = await prisma.parent.findUnique({
      where: { userId },
      select: {
        memberParents: {
          where: {
            member: {
              status: "ATIVO",
              clubId,
            },
          },
          select: { id: true },
          take: 1,
        },
      },
    });

    const hasActiveChildren =
      parent !== null && parent.memberParents.length > 0;

    if (!hasActiveChildren) {
      return <PendingAccessScreen />;
    }
  }

  // Signature gate: EVERY account-linked parent (any role — including a
  // diretor/preceptor/monitor who is also a parent) must e-sign each of their
  // children before using the app. Each signs their own signature, so a child
  // is only cleared for a parent once that parent has personally signed.
  if (parentId && clubId) {
    const unsignedChildren = await getUnsignedChildren(parentId, clubId);

    if (unsignedChildren.length > 0) {
      const parent = await prisma.parent.findUnique({
        where: { id: parentId },
        select: { fullName: true },
      });

      return (
        <ParentSignatureScreen
          unsignedChildren={unsignedChildren}
          parentName={parent?.fullName ?? "Responsável"}
        />
      );
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-1 overflow-auto p-3 pb-20 md:p-6 md:pb-6">{children}</main>
        <BottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
