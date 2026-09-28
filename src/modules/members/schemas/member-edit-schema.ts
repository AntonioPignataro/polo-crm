import { z } from "zod";

/**
 * Schema for the member editing form (MONITOR+ only).
 * Member data + a dynamic set of parents/guardians. No signature/health fields.
 *
 * Each parent entry may carry an `id` (an existing linked Parent record). New
 * entries (no id) require an email so the save can dedupe/create them; existing
 * entries are reconciled by id. Email requiredness is enforced in the action,
 * not here, so pre-filled legacy records with a blank email don't block edits.
 */
const editParentSchema = z.object({
  id: z.string().optional(),
  fullName: z.string().optional(),
  cpf: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  profession: z.string().optional(),
});

const editGuardianSchema = editParentSchema.extend({
  sex: z.enum(["MASCULINO", "FEMININO"], {
    message: "Selecione o sexo do responsável",
  }),
});

export const memberEditSchema = z.object({
  // Member data
  memberName: z.string().min(1, "Nome é obrigatório."),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória."),
  address: z.string().optional(),
  groupType: z.string().min(1, "Grupo é obrigatório."),
  module: z.string().optional(),
  modules: z.array(z.string()).optional(),
  polaresUntil: z.string().nullable().optional(),

  // Parents / guardians
  father: editParentSchema.optional(),
  mother: editParentSchema.optional(),
  guardians: z.array(editGuardianSchema).optional(),
});

export type MemberEditData = z.infer<typeof memberEditSchema>;
