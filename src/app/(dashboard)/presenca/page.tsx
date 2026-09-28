import { getMembersForAttendance } from "@/modules/attendance/queries/get-members-for-attendance";
import { getAttendanceSession } from "@/modules/attendance/queries/get-attendance-session";
import { AttendanceForm } from "@/modules/attendance/components/attendance-form";

export default async function PresencaPage() {
  // Default to QUINTA for initial load
  const defaultDayType = "QUINTA" as const;

  const [members, session] = await Promise.all([
    getMembersForAttendance(defaultDayType),
    getAttendanceSession({
      date: new Date().toISOString().split("T")[0],
      dayType: defaultDayType,
    }),
  ]);

  return (
    <AttendanceForm
      initialMembers={members}
      initialDayType={defaultDayType}
      initialSession={session}
    />
  );
}
