import { z } from "zod";

export const addStudyHourSchema = z.object({
  memberId: z.string().min(1, { message: "Sócio é obrigatório." }),
  weekStart: z.string().min(1, { message: "Semana é obrigatória." }),
  hours: z.number().min(0, { message: "Horas devem ser >= 0." }),
});

export type AddStudyHourInput = z.infer<typeof addStudyHourSchema>;
