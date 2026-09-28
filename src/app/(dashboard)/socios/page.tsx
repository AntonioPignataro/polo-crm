import { getMembers } from "@/modules/members/queries/get-members";
import { getRequiredSession } from "@/lib/auth-utils";
import { MembersTable } from "@/modules/members/components/members-table";

export default async function SociosPage() {
  const [members, session] = await Promise.all([
    getMembers(),
    getRequiredSession(),
  ]);

  return (
    <div className="space-y-4 md:space-y-6">
      <MembersTable initialMembers={members} userRole={session.role} />
    </div>
  );
}
