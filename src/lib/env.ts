import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  CRON_SECRET: z.string().min(1, "CRON_SECRET is required"),
});

/**
 * Validate that required environment variables exist.
 * Throws a descriptive error at startup if any are missing.
 */
export function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `Variaveis de ambiente obrigatorias nao configuradas:\n${errors}`
    );
  }

  return result.data;
}
