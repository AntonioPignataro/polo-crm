import { z } from "zod";

/**
 * The single definition of what counts as an acceptable password.
 *
 * Every path that sets a password imports this — registration, "alterar
 * senha", and the "esqueci minha senha" reset. If the rules lived in each
 * schema separately, the weakest path would quietly become the real policy.
 */
export const passwordField = z
  .string()
  .min(8, "Senha deve ter pelo menos 8 caracteres")
  .regex(/[a-zA-Z]/, "Senha deve conter pelo menos uma letra")
  .regex(/[0-9]/, "Senha deve conter pelo menos um número");

/** Shown under password inputs so the rules aren't a guessing game. */
export const PASSWORD_HINT = "Mínimo 8 caracteres, com letra e número";
