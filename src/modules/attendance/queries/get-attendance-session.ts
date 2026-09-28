"use server";

import { prisma } from "@/lib/prisma";
import { getRequiredSession } from "@/lib/auth-utils";

export interface AttendanceSessionRecord {
  memberId: string;
  present: boolean;
  onTime: boolean;
}

export interface AttendanceSessionData {
  sessionId: string;
  records: AttendanceSessionRecord[];
}

export async function getAttendanceSession(input: {
  date: string;
  dayType: "QUINTA" | "SEXTA" | "SABADO";
}): Promise<AttendanceSessionData | null> {
  const session = await getRequiredSession();

  const sessionDate = new Date(input.date + "T00:00:00.000Z");

  const attendanceSession = await prisma.attendanceSession.findUnique({
    where: {
      clubId_date_dayType: {
        clubId: session.clubId,
        date: sessionDate,
        dayType: input.dayType,
      },
    },
    include: {
      attendanceRecords: {
        select: {
          memberId: true,
          present: true,
          onTime: true,
        },
      },
    },
  });

  if (!attendanceSession) {
    return null;
  }

  return {
    sessionId: attendanceSession.id,
    records: attendanceSession.attendanceRecords.map((r) => ({
      memberId: r.memberId,
      present: r.present,
      onTime: r.onTime,
    })),
  };
}
