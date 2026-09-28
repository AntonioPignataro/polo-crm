"use server";

import { prisma } from "@/lib/prisma";
import { type ActionResult } from "@/lib/auth-utils";
import { sendEmail, formatNotificationHtml } from "@/lib/email";
import { revalidatePath } from "next/cache";

interface CalendarNotificationSummary {
  clubsProcessed: number;
  emailsSent: number;
  queueItemsProcessed: number;
}

const CHANGE_TYPE_LABELS: Record<string, string> = {
  CREATED: "Novo evento",
  UPDATED: "Evento atualizado",
  DELETED: "Evento removido",
};

/**
 * Process the CalendarNotificationQueue.
 *
 * Picks up items older than 30 minutes, groups by club,
 * builds a summary email, and sends to all eligible recipients.
 * Skips clubs with notificationsPaused = true.
 */
export async function sendCalendarNotifications(): Promise<
  ActionResult<CalendarNotificationSummary>
> {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    // Get all queue items older than 30 minutes
    const queueItems = await prisma.calendarNotificationQueue.findMany({
      where: {
        createdAt: { lte: thirtyMinutesAgo },
      },
      orderBy: { createdAt: "asc" },
    });

    if (queueItems.length === 0) {
      return {
        success: true,
        data: { clubsProcessed: 0, emailsSent: 0, queueItemsProcessed: 0 },
      };
    }

    // Group by clubId
    const byClub = new Map<
      string,
      typeof queueItems
    >();
    for (const item of queueItems) {
      const existing = byClub.get(item.clubId) ?? [];
      existing.push(item);
      byClub.set(item.clubId, existing);
    }

    let emailsSent = 0;
    let clubsProcessed = 0;

    for (const [clubId, items] of byClub) {
      // Check if club has notifications paused
      const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: { id: true, name: true, notificationsPaused: true },
      });

      if (!club || club.notificationsPaused) {
        // Delete processed items even if paused
        await prisma.calendarNotificationQueue.deleteMany({
          where: { id: { in: items.map((i) => i.id) } },
        });
        continue;
      }

      clubsProcessed++;

      // Build email body
      const changeLines = items.map((item) => {
        const dateStr = item.eventDate.toLocaleDateString("pt-BR");
        const label = CHANGE_TYPE_LABELS[item.changeType] ?? item.changeType;
        return `<li><strong>${label}</strong>: ${item.eventTitle} (${dateStr})</li>`;
      });

      const title = `Alterações no Calendário — ${club.name}`;
      const bodyHtml = `
        <p>O calendário do clube foi atualizado com as seguintes alterações:</p>
        <ul style="line-height: 1.8;">
          ${changeLines.join("\n")}
        </ul>
        <p style="margin-top: 16px; color: #666;">
          Total: ${items.length} alteração(ões).
        </p>
      `;

      const emailHtml = formatNotificationHtml(title, bodyHtml);

      // Get recipients: parents with active children, monitors, preceptors, directors
      // First get staff users
      const staffUsers = await prisma.user.findMany({
        where: {
          clubId,
          isActive: true,
          role: { in: ["DIRETOR", "PRECEPTOR", "MONITOR"] },
        },
        select: { id: true, email: true, name: true },
      });

      // Get USUARIO users who have active children (parents)
      const parentUsers = await prisma.user.findMany({
        where: {
          clubId,
          isActive: true,
          role: "USUARIO",
          parent: {
            memberParents: {
              some: {
                member: { clubId, status: "ATIVO" },
              },
            },
          },
        },
        select: { id: true, email: true, name: true },
      });

      // Deduplicate by userId
      const recipientMap = new Map<string, { id: string; email: string; name: string }>();
      for (const u of [...staffUsers, ...parentUsers]) {
        if (!recipientMap.has(u.id)) {
          recipientMap.set(u.id, u);
        }
      }

      const recipients = Array.from(recipientMap.values());

      for (const recipient of recipients) {
        if (!recipient.email) continue;

        // Create notification record
        const notification = await prisma.notification.create({
          data: {
            clubId,
            recipientId: recipient.id,
            type: "ALTERACAO_CALENDARIO",
            title,
            message: `${items.length} alteração(ões) no calendário do clube.`,
            channel: "EMAIL",
          },
        });

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
          emailsSent++;
        }
      }

      // Delete processed queue items
      await prisma.calendarNotificationQueue.deleteMany({
        where: { id: { in: items.map((i) => i.id) } },
      });
    }

    revalidatePath("/notificacoes");
    return {
      success: true,
      data: {
        clubsProcessed,
        emailsSent,
        queueItemsProcessed: queueItems.length,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao enviar notificações de calendário.";
    return { success: false, error: message };
  }
}
