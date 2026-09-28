/**
 * Email service abstraction using Resend.
 *
 * Required env vars:
 *   RESEND_API_KEY=re_xxxxxxxxxxxx
 *   RESEND_FROM_EMAIL=noreply@yourdomain.com
 *
 * If RESEND_API_KEY is not set, messages are logged to console (dev mode).
 */

import { Resend } from "resend";

export interface EmailAttachment {
  filename: string;
  content: Buffer;
}

export interface EmailMessage {
  to: string; // Recipient email address
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: "resend" | "console";
}

/**
 * Check if Resend email is configured.
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Send an email via Resend.
 */
async function sendViaResend(message: EmailMessage): Promise<EmailResult> {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      attachments: message.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    });

    if (error) {
      return {
        success: false,
        error: `Resend error: ${error.message}`,
        provider: "resend",
      };
    }

    return {
      success: true,
      messageId: data?.id ?? "unknown",
      provider: "resend",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro desconhecido ao enviar e-mail.",
      provider: "resend",
    };
  }
}

/**
 * Fallback: log message to console (development mode).
 */
function sendViaConsole(message: EmailMessage): EmailResult {
  const attachmentInfo = message.attachments
    ? ` [${message.attachments.length} anexo(s): ${message.attachments.map((a) => a.filename).join(", ")}]`
    : "";
  console.log(
    `[Email DEV] Para: ${message.to}\nAssunto: ${message.subject}${attachmentInfo}\n${message.html}\n---`
  );
  return {
    success: true,
    messageId: `dev-${Date.now()}`,
    provider: "console",
  };
}

/**
 * Send an email.
 * Uses Resend if configured, otherwise logs to console.
 */
export async function sendEmail(
  message: EmailMessage
): Promise<EmailResult> {
  if (isEmailConfigured()) {
    return sendViaResend(message);
  }

  return sendViaConsole(message);
}

/**
 * Send multiple emails sequentially.
 * Returns results for each message.
 */
export async function sendEmailBatch(
  messages: EmailMessage[]
): Promise<EmailResult[]> {
  const results: EmailResult[] = [];

  for (const msg of messages) {
    const result = await sendEmail(msg);
    results.push(result);

    // Small delay between messages to respect rate limits
    if (isEmailConfigured() && messages.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  return results;
}

/**
 * Escape HTML special characters to prevent XSS in email templates.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Format a notification into a simple HTML email body.
 */
export function formatNotificationHtml(
  title: string,
  body: string
): string {
  const safeTitle = escapeHtml(title);
  // Escape first, then convert markdown-style bold (*text*) to HTML bold
  const safeBody = escapeHtml(body).replace(/\*([^*]+)\*/g, "<strong>$1</strong>");

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a1a1a; margin-bottom: 16px;">${safeTitle}</h2>
      <p style="color: #333; line-height: 1.6; white-space: pre-line;">${safeBody}</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">
        Este e-mail foi enviado automaticamente pelo Sistema Polo.
      </p>
    </div>
  `;
}

/**
 * Format an alert notification email with contextual message.
 * Used for automated alert emails that include report attachments.
 */
export function formatAlertEmailHtml(
  title: string,
  alertMessage: string,
  summary: string
): string {
  const safeTitle = escapeHtml(title);
  const safeAlert = escapeHtml(alertMessage);
  const safeSummary = escapeHtml(summary);

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a1a1a; margin-bottom: 16px;">${safeTitle}</h2>
      <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
        <p style="margin: 0; color: #92400E; font-weight: 600;">Atenção</p>
        <p style="margin: 8px 0 0; color: #78350F;">${safeAlert}</p>
      </div>
      <p style="color: #333; line-height: 1.6;">${safeSummary}</p>
      <p style="color: #333; line-height: 1.6;">
        Os relatórios detalhados estão anexados em <strong>PDF</strong> e <strong>Excel</strong>.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">
        Este e-mail foi enviado automaticamente pelo Sistema Polo.
      </p>
    </div>
  `;
}
