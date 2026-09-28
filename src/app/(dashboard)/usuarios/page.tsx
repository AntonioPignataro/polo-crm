import { getUsers } from "@/modules/auth/queries/get-users";
import { UsersTable } from "@/modules/auth/components/users-table";
import { getRequiredSession } from "@/lib/auth-utils";
import type { UserRole } from "@/types";

export default async function UsuariosPage() {
  const session = await getRequiredSession();
  const users = await getUsers();

  return (
    <div className="space-y-4 md:space-y-6">
      <UsersTable
        initialUsers={users}
        currentUserRole={session.role as UserRole}
        currentUserId={session.userId}
      />
    </div>
  );
}
