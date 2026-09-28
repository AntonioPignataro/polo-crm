import { getRequiredSession } from "@/lib/auth-utils";
import { getPolarConfigs } from "@/modules/polares/queries/get-polar-configs";
import { getPolarRanking } from "@/modules/polares/queries/get-polar-ranking";
import { getMembersForLancamento } from "@/modules/polares/queries/get-members-for-lancamento";
import { getPolaresForDate } from "@/modules/polares/queries/get-polares-for-date";
import { PolaresTabs } from "@/modules/polares/components/polares-tabs";

export default async function PolaresPage() {
  const session = await getRequiredSession();
  const todayIso = new Date().toISOString().split("T")[0];

  const [members, polarConfigs, ranking, initialChecked] = await Promise.all([
    getMembersForLancamento(),
    getPolarConfigs(),
    getPolarRanking(),
    getPolaresForDate(todayIso),
  ]);

  return (
    <PolaresTabs
      members={members}
      polarConfigs={polarConfigs}
      ranking={ranking}
      userRole={session.role}
      initialDate={todayIso}
      initialChecked={initialChecked}
    />
  );
}
