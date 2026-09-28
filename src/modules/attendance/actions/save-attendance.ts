"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMonitor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { POLAR_DEFAULTS } from "@/lib/constants";
import type { PolarCategory } from "@/types";

// ---------------------------------------------------------------------------
// Schema (Zod v4)
// ---------------------------------------------------------------------------

const attendanceRecordSchema = z.object({
  memberId: z.string().min(1, "ID do sócio obrigatório"),
  present: z.boolean(),
  onTime: z.boolean(),
});

const saveAttendanceSchema = z.object({
  date: z.string().min(1, "Data obrigatória"),
  dayType: z.enum(["QUINTA", "SEXTA", "SABADO"], {
    message: "Tipo de dia inválido",
  }),
  records: z
    .array(attendanceRecordSchema)
    .min(1, "Pelo menos um registro é necessário"),
});

export type SaveAttendanceInput = z.infer<typeof saveAttendanceSchema>;

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

export async function saveAttendance(
  input: SaveAttendanceInput
): Promise<
  ActionResult<{ sessionId: string; presentCount: number; totalCount: number }>
> {
  try {
    const session = await requireMonitor();

    // Validate input
    const parsed = saveAttendanceSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const data = parsed.data;
    const sessionDate = new Date(data.date + "T00:00:00.000Z");

    // Verify all members belong to this club
    const memberIds = data.records.map((r) => r.memberId);
    const membersInClub = await prisma.member.count({
      where: { id: { in: memberIds }, clubId: session.clubId },
    });
    if (membersInClub !== memberIds.length) {
      return {
        success: false,
        error: "Um ou mais sócios não pertencem ao seu clube.",
      };
    }

    // Upsert the attendance session (unique on clubId + date + dayType)
    const attendanceSession = await prisma.attendanceSession.upsert({
      where: {
        clubId_date_dayType: {
          clubId: session.clubId,
          date: sessionDate,
          dayType: data.dayType,
        },
      },
      update: {
        createdBy: session.userId,
      },
      create: {
        clubId: session.clubId,
        date: sessionDate,
        dayType: data.dayType,
        createdBy: session.userId,
      },
    });

    // Upsert each attendance record
    let presentCount = 0;
    for (const record of data.records) {
      await prisma.attendanceRecord.upsert({
        where: {
          sessionId_memberId: {
            sessionId: attendanceSession.id,
            memberId: record.memberId,
          },
        },
        update: {
          present: record.present,
          onTime: record.present ? record.onTime : false,
        },
        create: {
          sessionId: attendanceSession.id,
          memberId: record.memberId,
          present: record.present,
          onTime: record.present ? record.onTime : false,
        },
      });

      if (record.present) {
        presentCount++;
      }
    }

    // ---------------------------------------------------------------
    // Auto-create PRESENCA / PONTUALIDADE polar entries
    // ---------------------------------------------------------------

    // Fetch G3 members that are excluded from polares (no valid polaresUntil)
    const now = new Date();
    const g3Set = new Set(
      (
        await prisma.member.findMany({
          where: {
            id: { in: memberIds },
            groupType: "G3",
            OR: [{ polaresUntil: null }, { polaresUntil: { lt: now } }],
          },
          select: { id: true },
        })
      ).map((m) => m.id)
    );

    // Fetch PolarConfig for PRESENCA and PONTUALIDADE (fall back to defaults)
    const polarConfigs = await prisma.polarConfig.findMany({
      where: {
        clubId: session.clubId,
        category: { in: ["PRESENCA", "PONTUALIDADE"] },
      },
    });
    const configMap = new Map(polarConfigs.map((c) => [c.category, c.defaultPoints]));

    const presencaPoints = configMap.get("PRESENCA") ?? POLAR_DEFAULTS.PRESENCA.points;
    const pontualidadePoints = configMap.get("PONTUALIDADE") ?? POLAR_DEFAULTS.PONTUALIDADE.points;

    // Collect members who need PRESENCA/PONTUALIDADE polares
    const presentMembers = data.records.filter((r) => r.present && !g3Set.has(r.memberId));
    const onTimeMembers = data.records.filter(
      (r) => r.present && r.onTime && !g3Set.has(r.memberId)
    );

    // Check for existing polar entries on this date to prevent duplicates
    const existingPolares = await prisma.polarEntry.findMany({
      where: {
        memberId: { in: presentMembers.map((r) => r.memberId) },
        date: sessionDate,
        category: { in: ["PRESENCA", "PONTUALIDADE"] },
      },
      select: { memberId: true, category: true },
    });

    const existingKey = new Set(
      existingPolares.map((e) => `${e.memberId}:${e.category}`)
    );

    const polarEntriesToCreate: {
      memberId: string;
      date: Date;
      category: PolarCategory;
      points: number;
      registeredBy: string;
    }[] = [];

    for (const r of presentMembers) {
      if (!existingKey.has(`${r.memberId}:PRESENCA`)) {
        polarEntriesToCreate.push({
          memberId: r.memberId,
          date: sessionDate,
          category: "PRESENCA",
          points: presencaPoints,
          registeredBy: session.userId,
        });
      }
    }

    for (const r of onTimeMembers) {
      if (!existingKey.has(`${r.memberId}:PONTUALIDADE`)) {
        polarEntriesToCreate.push({
          memberId: r.memberId,
          date: sessionDate,
          category: "PONTUALIDADE",
          points: pontualidadePoints,
          registeredBy: session.userId,
        });
      }
    }

    if (polarEntriesToCreate.length > 0) {
      await prisma.polarEntry.createMany({ data: polarEntriesToCreate });
    }

    revalidatePath("/presenca");
    revalidatePath("/polares");
    return {
      success: true,
      data: {
        sessionId: attendanceSession.id,
        presentCount,
        totalCount: data.records.length,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao salvar presença.";
    return { success: false, error: message };
  }
}
