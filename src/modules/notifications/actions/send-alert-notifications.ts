"use server";

import { prisma } from "@/lib/prisma";
import { requireDiretor, type ActionResult } from "@/lib/auth-utils";
import {
  sendEmail,
  formatAlertEmailHtml,
  type EmailAttachment,
} from "@/lib/email";
import {
  getPresencaReport,
  getAtendimentosReport,
  getFormacaoPaisReport,
  type ReportContext,
} from "@/modules/reports/queries/get-report-details";
import { generatePDFBuffer } from "@/lib/export-pdf-server";
import { generateExcelBuffer } from "@/lib/export-excel-server";
import { revalidatePath } from "next/cache";

interface AlertNotificationSummary {
  attendanceAlerts: number;
  preceptoriaAlerts: number;
  formacaoPaisAlerts: number;
  emailsSent: number;
  notificationsCreated: number;
}

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/**
 * Check attendance and preceptoria alerts for the current month,
 * then send email notifications with report attachments (PDF + Excel).
 *
 * Can be called manually by a DIRETOR or automatically via cron route.
 */
export async function sendAlertNotifications(
  clubIdOverride?: string
): Promise<ActionResult<AlertNotificationSummary>> {
  try {
    let clubId: string;
    let clubName: string;

    if (clubIdOverride) {
      // Called from cron — no session needed
      const club = await prisma.club.findUnique({
        where: { id: clubIdOverride },
        select: { id: true, name: true, notificationsPaused: true },
      });
      if (!club) {
        return { success: false, error: "Clube não encontrado." };
      }
      if (club.notificationsPaused) {
        return {
          success: true,
          data: {
            attendanceAlerts: 0,
            preceptoriaAlerts: 0,
            formacaoPaisAlerts: 0,
            emailsSent: 0,
            notificationsCreated: 0,
          },
        };
      }
      clubId = club.id;
      clubName = club.name;
    } else {
      // Called manually from UI — requires DIRETOR role
      const session = await requireDiretor();
      clubId = session.clubId;
      clubName = session.clubName;
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
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();
    const monthName = MONTH_NAMES[currentMonth - 1];
    const periodo = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

    const monthStart = new Date(currentYear, currentMonth - 1, 1);
    const monthEnd = new Date(currentYear, currentMonth, 0);
    // Reports now take a day range; the alert cron uses the whole current month.
    const range = {
      start: `${periodo}-01`,
      end: `${periodo}-${String(monthEnd.getDate()).padStart(2, "0")}`,
      year: currentYear,
    };

    let attendanceAlerts = 0;
    let preceptoriaAlerts = 0;
    let formacaoPaisAlerts = 0;
    let emailsSent = 0;
    let notificationsCreated = 0;

    // ========== Get all active members ==========
    const members = await prisma.member.findMany({
      where: { clubId, status: "ATIVO" },
      select: {
        id: true,
        fullName: true,
        preceptorId: true,
      },
    });

    // ========== Get recipients (DIRETOR + PRECEPTOR) ==========
    const recipients = await prisma.user.findMany({
      where: {
        clubId,
        isActive: true,
        role: { in: ["DIRETOR", "PRECEPTOR"] },
      },
      select: { id: true, email: true, name: true, role: true },
    });

    const directors = recipients.filter((r) => r.role === "DIRETOR");
    const preceptors = recipients.filter((r) => r.role === "PRECEPTOR");

    // ========== ALERTA_PRESENCA ==========

    // Get total attendance sessions this month
    const totalSessions = await prisma.attendanceSession.count({
      where: {
        clubId,
        date: { gte: monthStart, lte: monthEnd },
      },
    });

    if (totalSessions > 0) {
      // Get attendance counts per member
      const attendanceRecords = await prisma.attendanceRecord.groupBy({
        by: ["memberId"],
        where: {
          present: true,
          session: {
            clubId,
            date: { gte: monthStart, lte: monthEnd },
          },
        },
        _count: true,
      });

      const attendanceMap = new Map(
        attendanceRecords.map((r) => [r.memberId, r._count])
      );

      // Check for members with <= 50% attendance
      const lowAttendanceMembers: string[] = [];
      for (const member of members) {
        const attended = attendanceMap.get(member.id) ?? 0;
        const rate = attended / totalSessions;
        if (rate <= 0.5) {
          lowAttendanceMembers.push(member.fullName);
        }
      }

      attendanceAlerts = lowAttendanceMembers.length;

      if (attendanceAlerts > 0) {
        const alertTitle = `Alerta de Presença — ${monthName} ${currentYear}`;
        const alertMessage = `Foram identificados ${attendanceAlerts} sócio(s) com frequência igual ou abaixo de 50% neste mês.`;
        const summary = `Sócios com baixa frequência: ${lowAttendanceMembers.slice(0, 5).join(", ")}${attendanceAlerts > 5 ? ` e mais ${attendanceAlerts - 5}...` : ""}`;

        // Send to DIRETORs (full report)
        for (const director of directors) {
          if (!director.email) continue;

          const ctx: ReportContext = {
            clubId,
            clubName,
            role: "DIRETOR",
            userId: director.id,
          };

          const reportData = await getPresencaReport(range, ctx);
          const pdfBuffer = generatePDFBuffer(reportData);
          const excelBuffer = await generateExcelBuffer(reportData);

          const attachments: EmailAttachment[] = [
            { filename: `presenca-${periodo}.pdf`, content: pdfBuffer },
            { filename: `presenca-${periodo}.xlsx`, content: excelBuffer },
          ];

          const emailHtml = formatAlertEmailHtml(alertTitle, alertMessage, summary);

          const result = await sendEmail({
            to: director.email,
            subject: alertTitle,
            html: emailHtml,
            attachments,
          });

          // Create notification record
          const notification = await prisma.notification.create({
            data: {
              clubId,
              recipientId: director.id,
              type: "ALERTA_PRESENCA",
              title: alertTitle,
              message: alertMessage,
              channel: "EMAIL",
            },
          });
          notificationsCreated++;

          if (result.success) {
            await prisma.notification.update({
              where: { id: notification.id },
              data: { sentAt: new Date() },
            });
            emailsSent++;
          }
        }

        // Send to PRECEPTORs (filtered to assigned members)
        for (const preceptor of preceptors) {
          if (!preceptor.email) continue;

          // Check if this preceptor has any assigned members with low attendance
          const assignedLow = members.filter((m) => {
            if (m.preceptorId !== preceptor.id) return false;
            const attended = attendanceMap.get(m.id) ?? 0;
            return attended / totalSessions <= 0.5;
          });

          if (assignedLow.length === 0) continue;

          const ctx: ReportContext = {
            clubId,
            clubName,
            role: "PRECEPTOR",
            userId: preceptor.id,
          };

          const reportData = await getPresencaReport(range, ctx);
          const pdfBuffer = generatePDFBuffer(reportData);
          const excelBuffer = await generateExcelBuffer(reportData);

          const attachments: EmailAttachment[] = [
            { filename: `presenca-${periodo}.pdf`, content: pdfBuffer },
            { filename: `presenca-${periodo}.xlsx`, content: excelBuffer },
          ];

          const preceptorMessage = `Foram identificados ${assignedLow.length} sócio(s) sob sua preceptoria com frequência igual ou abaixo de 50% neste mês.`;
          const preceptorSummary = `Sócios: ${assignedLow.map((m) => m.fullName).join(", ")}`;

          const emailHtml = formatAlertEmailHtml(alertTitle, preceptorMessage, preceptorSummary);

          const result = await sendEmail({
            to: preceptor.email,
            subject: alertTitle,
            html: emailHtml,
            attachments,
          });

          const notification = await prisma.notification.create({
            data: {
              clubId,
              recipientId: preceptor.id,
              type: "ALERTA_PRESENCA",
              title: alertTitle,
              message: preceptorMessage,
              channel: "EMAIL",
            },
          });
          notificationsCreated++;

          if (result.success) {
            await prisma.notification.update({
              where: { id: notification.id },
              data: { sentAt: new Date() },
            });
            emailsSent++;
          }
        }
      }
    }

    // ========== ALERTA_PRECEPTORIA ==========

    const appointments = await prisma.appointment.findMany({
      where: {
        member: { clubId },
        date: { gte: monthStart, lte: monthEnd },
      },
      select: {
        memberId: true,
        type: true,
      },
    });

    // Group appointments by member
    const memberAppointments = new Map<
      string,
      { preceptoria: number; sacerdote: number }
    >();

    for (const appt of appointments) {
      let entry = memberAppointments.get(appt.memberId);
      if (!entry) {
        entry = { preceptoria: 0, sacerdote: 0 };
        memberAppointments.set(appt.memberId, entry);
      }
      if (appt.type === "PRECEPTORIA_SOCIO") {
        entry.preceptoria++;
      } else if (appt.type === "SACERDOTE") {
        entry.sacerdote++;
      }
    }

    // Check for members with < 2 preceptorias or 0 sacerdote
    const lowPreceptoriaMembers: { name: string; preceptorId: string | null }[] = [];
    for (const member of members) {
      const appts = memberAppointments.get(member.id) ?? {
        preceptoria: 0,
        sacerdote: 0,
      };

      if (appts.preceptoria < 2 || appts.sacerdote === 0) {
        lowPreceptoriaMembers.push({
          name: member.fullName,
          preceptorId: member.preceptorId,
        });
      }
    }

    preceptoriaAlerts = lowPreceptoriaMembers.length;

    if (preceptoriaAlerts > 0) {
      const alertTitle = `Alerta de Preceptoria — ${monthName} ${currentYear}`;
      const alertMessage = `Foram identificados ${preceptoriaAlerts} sócio(s) com atendimentos abaixo do esperado neste mês (menos de 2 preceptorias ou 0 sacerdote).`;
      const summary = `Sócios: ${lowPreceptoriaMembers.slice(0, 5).map((m) => m.name).join(", ")}${preceptoriaAlerts > 5 ? ` e mais ${preceptoriaAlerts - 5}...` : ""}`;

      // Send to DIRETORs (full atendimentos report)
      for (const director of directors) {
        if (!director.email) continue;

        const ctx: ReportContext = {
          clubId,
          clubName,
          role: "DIRETOR",
          userId: director.id,
        };

        const reportData = await getAtendimentosReport(range, ctx);
        const pdfBuffer = generatePDFBuffer(reportData);
        const excelBuffer = await generateExcelBuffer(reportData);

        const attachments: EmailAttachment[] = [
          { filename: `atendimentos-${periodo}.pdf`, content: pdfBuffer },
          { filename: `atendimentos-${periodo}.xlsx`, content: excelBuffer },
        ];

        const emailHtml = formatAlertEmailHtml(alertTitle, alertMessage, summary);

        const result = await sendEmail({
          to: director.email,
          subject: alertTitle,
          html: emailHtml,
          attachments,
        });

        const notification = await prisma.notification.create({
          data: {
            clubId,
            recipientId: director.id,
            type: "ALERTA_PRECEPTORIA",
            title: alertTitle,
            message: alertMessage,
            channel: "EMAIL",
          },
        });
        notificationsCreated++;

        if (result.success) {
          await prisma.notification.update({
            where: { id: notification.id },
            data: { sentAt: new Date() },
          });
          emailsSent++;
        }
      }

      // Send to PRECEPTORs (filtered atendimentos report)
      for (const preceptor of preceptors) {
        if (!preceptor.email) continue;

        // Check if this preceptor has any assigned members with low preceptoria
        const assignedLow = lowPreceptoriaMembers.filter(
          (m) => m.preceptorId === preceptor.id
        );

        if (assignedLow.length === 0) continue;

        const ctx: ReportContext = {
          clubId,
          clubName,
          role: "PRECEPTOR",
          userId: preceptor.id,
        };

        const reportData = await getAtendimentosReport(range, ctx);
        const pdfBuffer = generatePDFBuffer(reportData);
        const excelBuffer = await generateExcelBuffer(reportData);

        const attachments: EmailAttachment[] = [
          { filename: `atendimentos-${periodo}.pdf`, content: pdfBuffer },
          { filename: `atendimentos-${periodo}.xlsx`, content: excelBuffer },
        ];

        const preceptorMessage = `Foram identificados ${assignedLow.length} sócio(s) sob sua preceptoria com atendimentos abaixo do esperado neste mês.`;
        const preceptorSummary = `Sócios: ${assignedLow.map((m) => m.name).join(", ")}`;

        const emailHtml = formatAlertEmailHtml(alertTitle, preceptorMessage, preceptorSummary);

        const result = await sendEmail({
          to: preceptor.email,
          subject: alertTitle,
          html: emailHtml,
          attachments,
        });

        const notification = await prisma.notification.create({
          data: {
            clubId,
            recipientId: preceptor.id,
            type: "ALERTA_PRECEPTORIA",
            title: alertTitle,
            message: preceptorMessage,
            channel: "EMAIL",
          },
        });
        notificationsCreated++;

        if (result.success) {
          await prisma.notification.update({
            where: { id: notification.id },
            data: { sentAt: new Date() },
          });
          emailsSent++;
        }
      }
    }

    // ========== ALERTA_FORMACAO_PAIS ==========

    // Get formations in this month
    const formations = await prisma.parentFormation.findMany({
      where: {
        clubId,
        date: { gte: monthStart, lte: monthEnd },
      },
      select: {
        id: true,
        type: true,
        attendance: {
          select: { parentId: true, present: true },
        },
      },
    });

    if (formations.length > 0) {
      // Get all parents linked to this club's members, including their member→preceptor links
      const parents = await prisma.parent.findMany({
        where: {
          memberParents: {
            some: { member: { clubId } },
          },
        },
        select: {
          id: true,
          fullName: true,
          relationship: true,
          sex: true,
          memberParents: {
            where: { member: { clubId } },
            select: {
              member: { select: { preceptorId: true } },
            },
          },
        },
      });

      // Build sets of parentIds who were present in each formation type
      const presentFormacaoPai = new Set<string>();
      const presentFormacaoCasal = new Set<string>();

      for (const f of formations) {
        for (const a of f.attendance) {
          if (!a.present) continue;
          if (f.type === "FORMACAO_PAI") {
            presentFormacaoPai.add(a.parentId);
          } else if (f.type === "FORMACAO_CASAL") {
            presentFormacaoCasal.add(a.parentId);
          }
        }
      }

      const hasFormacaoPai = formations.some((f) => f.type === "FORMACAO_PAI");
      const hasFormacaoCasal = formations.some((f) => f.type === "FORMACAO_CASAL");

      // Determine if a parent should attend Formacao Pai (males only)
      const shouldAttendFormacaoPai = (p: { relationship: string; sex: string | null }) => {
        if (p.relationship === "PAI") return true;
        if (p.relationship === "MAE") return false;
        return p.sex === "MASCULINO";
      };

      // For FORMACAO_CASAL: build member -> parent[] map to check family coverage
      // A family is "covered" if at least one parent/guardian of the member attended
      const memberParentLinks = await prisma.memberParent.findMany({
        where: { member: { clubId } },
        select: { memberId: true, parentId: true },
      });

      // memberId -> set of parentIds
      const memberFamilyMap = new Map<string, string[]>();
      for (const link of memberParentLinks) {
        const existing = memberFamilyMap.get(link.memberId) ?? [];
        existing.push(link.parentId);
        memberFamilyMap.set(link.memberId, existing);
      }

      // memberIds where at least one parent attended FORMACAO_CASAL
      const familyCoveredByCasal = new Set<string>();
      for (const [memberId, parentIds] of memberFamilyMap) {
        for (const pid of parentIds) {
          if (presentFormacaoCasal.has(pid)) {
            familyCoveredByCasal.add(memberId);
            break;
          }
        }
      }

      // parentId -> memberIds (from memberParentLinks)
      const parentToMemberIds = new Map<string, string[]>();
      for (const link of memberParentLinks) {
        const existing = parentToMemberIds.get(link.parentId) ?? [];
        existing.push(link.memberId);
        parentToMemberIds.set(link.parentId, existing);
      }

      // Find parents who missed at least one formation they should have attended
      const missingParents: {
        name: string;
        preceptorIds: (string | null)[];
      }[] = [];

      for (const p of parents) {
        const missedFormacaoPai =
          hasFormacaoPai &&
          shouldAttendFormacaoPai(p) &&
          !presentFormacaoPai.has(p.id);

        // For FORMACAO_CASAL: only alert if the parent missed AND
        // none of their linked members' families are covered (no other parent attended)
        let missedFormacaoCasal = false;
        if (hasFormacaoCasal && !presentFormacaoCasal.has(p.id)) {
          const linkedMemberIds = parentToMemberIds.get(p.id) ?? [];
          const anyFamilyCovered = linkedMemberIds.some((mid) =>
            familyCoveredByCasal.has(mid)
          );
          // Only flag as missing if no family member covered the obligation
          if (!anyFamilyCovered) {
            missedFormacaoCasal = true;
          }
        }

        if (missedFormacaoPai || missedFormacaoCasal) {
          // Collect unique preceptorIds from all members linked to this parent
          const preceptorIds = [
            ...new Set(p.memberParents.map((mp) => mp.member.preceptorId)),
          ];
          missingParents.push({ name: p.fullName, preceptorIds });
        }
      }

      formacaoPaisAlerts = missingParents.length;

      if (formacaoPaisAlerts > 0) {
        const alertTitle = `Alerta de Formação de Pais — ${monthName} ${currentYear}`;
        const alertMessage = `Foram identificados ${formacaoPaisAlerts} pai(s)/responsável(eis) que faltaram a pelo menos uma formação neste mês.`;
        const summary = `Pais/Responsáveis com falta: ${missingParents.slice(0, 5).map((m) => m.name).join(", ")}${formacaoPaisAlerts > 5 ? ` e mais ${formacaoPaisAlerts - 5}...` : ""}`;

        // Send to DIRETORs (full report)
        for (const director of directors) {
          if (!director.email) continue;

          const ctx: ReportContext = {
            clubId,
            clubName,
            role: "DIRETOR",
            userId: director.id,
          };

          const reportData = await getFormacaoPaisReport(range, ctx);
          const pdfBuffer = generatePDFBuffer(reportData);
          const excelBuffer = await generateExcelBuffer(reportData);

          const attachments: EmailAttachment[] = [
            { filename: `formacao-pais-${periodo}.pdf`, content: pdfBuffer },
            { filename: `formacao-pais-${periodo}.xlsx`, content: excelBuffer },
          ];

          const directorMessage = `${alertMessage}\n\nVocê está recebendo este e-mail porque, como diretor(a) do clube, é responsável por acompanhar a participação dos pais e responsáveis nas formações mensais. Em anexo, segue o relatório completo de Formação de Pais do mês.`;
          const emailHtml = formatAlertEmailHtml(alertTitle, directorMessage, summary);

          const result = await sendEmail({
            to: director.email,
            subject: alertTitle,
            html: emailHtml,
            attachments,
          });

          const notification = await prisma.notification.create({
            data: {
              clubId,
              recipientId: director.id,
              type: "ALERTA_FORMACAO_PAIS",
              title: alertTitle,
              message: alertMessage,
              channel: "EMAIL",
            },
          });
          notificationsCreated++;

          if (result.success) {
            await prisma.notification.update({
              where: { id: notification.id },
              data: { sentAt: new Date() },
            });
            emailsSent++;
          }
        }

        // Send to PRECEPTORs (filtered to parents of their assigned members)
        for (const preceptor of preceptors) {
          if (!preceptor.email) continue;

          // Check if this preceptor has any assigned parents who missed formation
          const assignedMissing = missingParents.filter((m) =>
            m.preceptorIds.includes(preceptor.id)
          );

          if (assignedMissing.length === 0) continue;

          const ctx: ReportContext = {
            clubId,
            clubName,
            role: "PRECEPTOR",
            userId: preceptor.id,
          };

          const reportData = await getFormacaoPaisReport(range, ctx);
          const pdfBuffer = generatePDFBuffer(reportData);
          const excelBuffer = await generateExcelBuffer(reportData);

          const attachments: EmailAttachment[] = [
            { filename: `formacao-pais-${periodo}.pdf`, content: pdfBuffer },
            { filename: `formacao-pais-${periodo}.xlsx`, content: excelBuffer },
          ];

          const preceptorMessage = `Foram identificados ${assignedMissing.length} pai(s)/responsável(eis) de sócios sob sua preceptoria que faltaram a pelo menos uma formação neste mês.\n\nVocê está recebendo este e-mail para que possa acompanhar e incentivar a participação dos pais nas formações. Em anexo, segue o relatório filtrado com os pais/responsáveis dos seus preceptorados.`;
          const preceptorSummary = `Pais/Responsáveis: ${assignedMissing.map((m) => m.name).join(", ")}`;

          const emailHtml = formatAlertEmailHtml(alertTitle, preceptorMessage, preceptorSummary);

          const result = await sendEmail({
            to: preceptor.email,
            subject: alertTitle,
            html: emailHtml,
            attachments,
          });

          const notification = await prisma.notification.create({
            data: {
              clubId,
              recipientId: preceptor.id,
              type: "ALERTA_FORMACAO_PAIS",
              title: alertTitle,
              message: `${assignedMissing.length} pai(s)/responsável(eis) sob sua preceptoria faltaram a formações neste mês.`,
              channel: "EMAIL",
            },
          });
          notificationsCreated++;

          if (result.success) {
            await prisma.notification.update({
              where: { id: notification.id },
              data: { sentAt: new Date() },
            });
            emailsSent++;
          }
        }
      }
    }

    revalidatePath("/notificacoes");
    return {
      success: true,
      data: {
        attendanceAlerts,
        preceptoriaAlerts,
        formacaoPaisAlerts,
        emailsSent,
        notificationsCreated,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao enviar alertas.";
    return { success: false, error: message };
  }
}
