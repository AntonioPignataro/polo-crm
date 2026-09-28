"use server";

import { prisma } from "@/lib/prisma";
import { requireDiretor, type ActionResult } from "@/lib/auth-utils";
import { sendEmail, formatNotificationHtml } from "@/lib/email";
import { revalidatePath } from "next/cache";

interface BirthdaySummary {
  birthdayCount: number;
  created: number;
  sent: number;
}

/**
 * Send birthday notifications for the current week (Monday–Sunday).
 *
 * Queries all active members whose birthday falls within the current week,
 * builds a formatted list, and emails it to all DIRETOR, PRECEPTOR, and MONITOR users.
 *
 * Runs weekly (Mondays) via Vercel Cron, or manually by a DIRETOR.
 */
export async function sendBirthdayNotifications(
  clubIdOverride?: string
): Promise<ActionResult<BirthdaySummary>> {
  try {
    let clubId: string;

    if (clubIdOverride) {
      // Called from cron — no session needed
      const club = await prisma.club.findUnique({
        where: { id: clubIdOverride },
        select: { id: true, notificationsPaused: true },
      });
      if (!club) {
        return { success: false, error: "Clube não encontrado." };
      }
      if (club.notificationsPaused) {
        return {
          success: true,
          data: { birthdayCount: 0, created: 0, sent: 0 },
        };
      }
      clubId = club.id;
    } else {
      // Called manually from UI — requires DIRETOR role
      const session = await requireDiretor();
      clubId = session.clubId;
      // Check if notifications are paused
      const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: { notificationsPaused: true },
      });
      if (club?.notificationsPaused) {
        return {
          success: false,
          error: "Notificações automáticas estão pausadas para este clube.",
        };
      }
    }

    const now = new Date();
    const currentYear = now.getFullYear();

    // Calculate the week range: from today (Monday) to next Sunday
    // If today is not Monday, calculate the current week's Monday
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekStartStr = weekStart.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
    const weekEndStr = weekEnd.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });

    // Get all active members in the club
    const allMembers = await prisma.member.findMany({
      where: {
        clubId,
        status: "ATIVO",
      },
      select: {
        id: true,
        fullName: true,
        birthDate: true,
      },
    });

    // Filter to members whose birthDate falls within this week (same month/day range)
    const birthdayMembers = allMembers
      .filter((m) => {
        const d = new Date(m.birthDate);
        // Create a "this year" version of the birthday
        const birthdayThisYear = new Date(
          currentYear,
          d.getMonth(),
          d.getDate()
        );
        return birthdayThisYear >= weekStart && birthdayThisYear <= weekEnd;
      })
      .sort((a, b) => {
        const dA = new Date(a.birthDate);
        const dB = new Date(b.birthDate);
        const bA = new Date(currentYear, dA.getMonth(), dA.getDate());
        const bB = new Date(currentYear, dB.getMonth(), dB.getDate());
        return bA.getTime() - bB.getTime();
      });

    if (birthdayMembers.length === 0) {
      return {
        success: true,
        data: { birthdayCount: 0, created: 0, sent: 0 },
      };
    }

    // Build the birthday list HTML
    const listItems = birthdayMembers
      .map((m) => {
        const bd = new Date(m.birthDate);
        const day = bd.getDate().toString().padStart(2, "0");
        const month = (bd.getMonth() + 1).toString().padStart(2, "0");
        const age = currentYear - bd.getFullYear();
        return `<li><strong>${m.fullName}</strong> — ${day}/${month} (${age} anos)</li>`;
      })
      .join("\n");

    const title = `Aniversariantes da semana (${weekStartStr} a ${weekEndStr})`;
    const bodyHtml = `
      <p>Confira os aniversariantes da semana de <strong>${weekStartStr}</strong> a <strong>${weekEndStr}</strong>:</p>
      <ul style="line-height: 1.8;">
        ${listItems}
      </ul>
      <p style="margin-top: 16px; color: #666;">
        Total: ${birthdayMembers.length} aniversariante(s) nesta semana.
      </p>
    `;

    const emailHtml = formatNotificationHtml(title, bodyHtml);

    // Get all recipients: DIRETOR, PRECEPTOR, MONITOR
    const recipients = await prisma.user.findMany({
      where: {
        clubId,
        isActive: true,
        role: { in: ["DIRETOR", "PRECEPTOR", "MONITOR"] },
      },
      select: { id: true, email: true, name: true },
    });

    let created = 0;
    let sent = 0;

    for (const recipient of recipients) {
      // Create notification record
      const notification = await prisma.notification.create({
        data: {
          clubId,
          recipientId: recipient.id,
          type: "ANIVERSARIO",
          title,
          message: `${birthdayMembers.length} aniversariante(s) na semana de ${weekStartStr} a ${weekEndStr}.`,
          channel: "EMAIL",
        },
      });
      created++;

      // Send email
      if (recipient.email) {
        const result = await sendEmail({
          to: recipient.email,
          subject: title,
          html: emailHtml,
        });

        if (result.success) {
          await prisma.notification.update({
            where: { id: notification.id },
            data: { sentAt: new Date() },
          });
          sent++;
        }
      }
    }

    revalidatePath("/notificacoes");
    return {
      success: true,
      data: { birthdayCount: birthdayMembers.length, created, sent },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao enviar notificações de aniversário.";
    return { success: false, error: message };
  }
}
