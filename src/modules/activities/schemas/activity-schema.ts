import { z } from "zod";

export const activityStatusValues = [
  "PLANEJADA",
  "INSCRICOES_ABERTAS",
  "INSCRICOES_ENCERRADAS",
  "CONCLUIDA",
  "CANCELADA",
] as const;

export const createActivitySchema = z.object({
  name: z.string().min(1, { message: "Nome da atividade é obrigatório." }),
  description: z.string().optional(),
  startDate: z.string().min(1, { message: "Data de início é obrigatória." }),
  endDate: z.string().optional(),
  costPerPerson: z.number().min(0, { message: "Custo não pode ser negativo." }).optional(),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;

export const updateActivitySchema = z.object({
  id: z.string().min(1, { message: "ID da atividade é obrigatório." }),
  name: z.string().min(1, { message: "Nome da atividade é obrigatório." }),
  description: z.string().optional(),
  startDate: z.string().min(1, { message: "Data de início é obrigatória." }),
  endDate: z.string().optional(),
  costPerPerson: z
    .number()
    .min(0, { message: "Custo não pode ser negativo." })
    .optional(),
  status: z.enum(activityStatusValues, {
    message: "Status inválido.",
  }),
});

export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
