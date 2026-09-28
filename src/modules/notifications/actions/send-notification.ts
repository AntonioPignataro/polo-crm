"use server";

import { prisma } from "@/lib/prisma";
import { requireDiretor, type ActionResult } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { sendEmail, formatNotificationHtml } from "@/lib/email";
import {
  sendNotificationSchema,
  type SendNotificationInput,
} from "@/modules/notifications/schemas/notification-schema";

export async function sendNotification(
  input: SendNotificationInput
): Promise<ActionResult<{ created: number; sent: number }>> {
  try {
    const session = await requireDiretor();

    const parsed = sendNotificationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const { recipientIds, type, title, message } = parsed.data;

    // Verify all recipients belong to club
    const recipients = await prisma.user.findMany({
      where: {
        id: { in: recipientIds },
        clubId: session.clubId,
      },
      select: { id: true, email: true, name: true },
    });

    if (recipients.length === 0) {
      return {
        success: false,
        error: "Nenhum destinatário válido encontrado no seu clube.",
      };
    }

    // Deduplicate by userId
    const uniqueRecipients = Array.from(
      new Map(recipients.map((r) => [r.id, r])).values()
    );

    const emailHtml = formatNotificationHtml(title, message);

    let created = 0;
    let sent = 0;

    for (const recipient of uniqueRecipients) {
      // Create notification record
      const notification = await prisma.notification.create({
        data: {
          clubId: session.clubId,
          recipientId: recipient.id,
          type,
          title,
          message,
          channel: "EMAIL",
        },
      });
      created++;

      // Send via email
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
    return { success: true, data: { created, sent } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao enviar notificação.";
    return { success: false, error: message };
  }
}
