import { z } from "zod";
import { passwordField } from "./password-rules";

export const requestResetSchema = z.object({
  email: z.string().email("Email inválido"),
});

export type RequestResetInput = z.infer<typeof requestResetSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Link inválido"),
    newPassword: passwordField,
    confirmPassword: z.string().min(1, "Confirme sua nova senha"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const adminResetSchema = z.object({
  userId: z.string().min(1, "Usuário inválido"),
});

export type AdminResetInput = z.infer<typeof adminResetSchema>;
