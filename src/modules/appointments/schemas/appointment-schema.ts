import { z } from "zod";

export const appointmentTypeValues = [
  "SACERDOTE",
  "PRECEPTORIA_SOCIO",
  "PRECEPTORIA_PAIS",
] as const;

export const createAppointmentSchema = z.object({
  memberId: z.string().min(1, { message: "Sócio é obrigatório." }),
  date: z.string().min(1, { message: "Data é obrigatória." }),
  type: z.enum(appointmentTypeValues, {
    message: "Tipo de atendimento inválido.",
  }),
  notes: z.string().optional(),
  purposes: z.string().optional(),
  lifePlan: z.string().optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentSchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1, { message: "Data é obrigatória." }),
  notes: z.string().optional(),
  purposes: z.string().optional(),
  lifePlan: z.string().optional(),
});

export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
