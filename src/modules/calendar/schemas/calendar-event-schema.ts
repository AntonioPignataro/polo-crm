import { z } from "zod";

export const calendarEventTypeValues = [
  "CLUBE_REGULAR",
  "ATIVIDADE_EXTERNA",
  "FORMACAO_PAIS",
  "SEM_ATIVIDADE",
  "OUTROS",
] as const;

export const createCalendarEventSchema = z.object({
  semester: z.string().min(1, { message: "Semestre é obrigatório." }),
  title: z.string().min(1, { message: "Título é obrigatório." }),
  date: z.string().min(1, { message: "Data é obrigatória." }),
  eventType: z.enum(calendarEventTypeValues, {
    message: "Tipo de evento inválido.",
  }),
  description: z.string().optional(),
});

export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;
