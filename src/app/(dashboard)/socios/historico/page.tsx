import { getInactiveMembers } from "@/modules/members/queries/get-inactive-members";
import { MemberHistoryTable } from "@/modules/members/components/member-history-table";

export default async function HistoricoSociosPage() {
  const members = await getInactiveMembers();

  return (
    <div className="space-y-4 md:space-y-6">
      <MemberHistoryTable members={members} />
    </div>
  );
}
