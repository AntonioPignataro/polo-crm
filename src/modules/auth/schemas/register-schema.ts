import { z } from "zod";
import { passwordField } from "./password-rules";

export const registerSchema = z
  .object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    email: z.string().email("Email inválido"),
    password: passwordField,
    confirmPassword: z.string().min(1, "Confirme sua senha"),
    phone: z.string().min(1, "Telefone é obrigatório"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
