import { z } from "zod";

export const sendNotificationSchema = z.object({
  recipientIds: z
    .array(z.string().min(1))
    .min(1, { message: "Selecione pelo menos um destinatário." }),
  type: z.enum([
    "ALERTA_PRESENCA",
    "ALERTA_PRECEPTORIA",
    "ALERTA_FORMACAO_PAIS",
    "LEMBRETE_ATIVIDADE",
    "GERAL",
    "ANIVERSARIO",
    "ALTERACAO_CALENDARIO",
  ]),
  title: z.string().min(1, { message: "Título é obrigatório." }),
  message: z.string().min(1, { message: "Mensagem é obrigatória." }),
});

export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;

export const sendBulkNotificationSchema = z.object({
  type: z.enum([
    "ALERTA_PRESENCA",
    "ALERTA_PRECEPTORIA",
    "ALERTA_FORMACAO_PAIS",
    "LEMBRETE_ATIVIDADE",
    "GERAL",
    "ANIVERSARIO",
    "ALTERACAO_CALENDARIO",
  ]),
  title: z.string().min(1, { message: "Título é obrigatório." }),
  message: z.string().min(1, { message: "Mensagem é obrigatória." }),
  recipientIds: z
    .array(z.string().min(1))
    .min(1, { message: "Selecione pelo menos um destinatário." }),
});

export type SendBulkNotificationInput = z.infer<typeof sendBulkNotificationSchema>;
