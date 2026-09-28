import { getPreceptorsWithMembers } from "@/modules/preceptors/queries/get-preceptors-with-members";
import { getUnassignedMembers } from "@/modules/preceptors/queries/get-unassigned-members";
import { getRequiredSession } from "@/lib/auth-utils";
import { PreceptorsView } from "@/modules/preceptors/components/preceptors-view";

export default async function PreceptoresPage() {
  const [preceptors, unassignedMembers, session] = await Promise.all([
    getPreceptorsWithMembers(),
    getUnassignedMembers(),
    getRequiredSession(),
  ]);

  const canManage =
    session.role === "SUPER_ADMIN" || session.role === "DIRETOR";

  return (
    <div className="space-y-4 md:space-y-6">
      <PreceptorsView
        preceptors={preceptors}
        unassignedMembers={unassignedMembers}
        canManage={canManage}
      />
    </div>
  );
}
