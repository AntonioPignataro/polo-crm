import { z } from "zod";

const parentFieldsSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
  cpf: z.string().optional(),
  profession: z.string().optional(),
});

const guardianSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
  cpf: z.string().optional(),
  profession: z.string().optional(),
  sex: z.enum(["MASCULINO", "FEMININO"], {
    message: "Selecione o sexo do responsável",
  }),
});

export const createMemberSchema = z.object({
  fullName: z
    .string()
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .max(200, "Nome muito longo"),
  birthDate: z.string().min(1, "Data de nascimento obrigatória"),
  address: z.string().optional(),
  groupType: z.enum(["G1", "G2", "G3"], {
    message: "Selecione um grupo",
  }),
  modules: z
    .array(z.enum(["QUINTA", "SEXTA", "SABADO"]))
    .min(1, "Selecione pelo menos um módulo"),
  preceptorId: z.string().optional(),
  enrollmentDate: z.string().optional(),
  // Parent data (optional — but email is required when provided)
  father: parentFieldsSchema.optional(),
  mother: parentFieldsSchema.optional(),
  // Additional guardians (RESPONSAVEL)
  guardians: z.array(guardianSchema).optional(),
});

export const updateMemberSchema = createMemberSchema.partial().extend({
  id: z.string().cuid(),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type GuardianInput = z.infer<typeof guardianSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
