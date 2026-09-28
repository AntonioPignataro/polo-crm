import { z } from "zod";

export const updateUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["SUPER_ADMIN", "DIRETOR", "PRECEPTOR", "MONITOR", "USUARIO"], {
    message: "Papel inválido",
  }),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export const toggleUserActiveSchema = z.object({
  userId: z.string().min(1),
  isActive: z.boolean(),
});

export type ToggleUserActiveInput = z.infer<typeof toggleUserActiveSchema>;
