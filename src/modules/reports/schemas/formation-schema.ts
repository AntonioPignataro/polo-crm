import { z } from "zod";

export const formationTypeValues = ["FORMACAO_PAI", "FORMACAO_CASAL"] as const;

export const createFormationSchema = z.object({
  name: z.string().min(1, { message: "Nome da formação é obrigatório." }),
  type: z.enum(formationTypeValues, {
    message: "Tipo de formação inválido.",
  }),
  date: z.string().min(1, { message: "Data é obrigatória." }),
  description: z.string().optional(),
});

export type CreateFormationInput = z.infer<typeof createFormationSchema>;

export const updateFormationSchema = z.object({
  id: z.string().min(1, { message: "ID da formação é obrigatório." }),
  name: z.string().min(1, { message: "Nome da formação é obrigatório." }),
  type: z.enum(formationTypeValues, {
    message: "Tipo de formação inválido.",
  }),
  date: z.string().min(1, { message: "Data é obrigatória." }),
  description: z.string().optional(),
});

export type UpdateFormationInput = z.infer<typeof updateFormationSchema>;
