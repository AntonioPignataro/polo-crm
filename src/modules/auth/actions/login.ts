"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export async function login(email: string, password: string) {
  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    return {};
  } catch (error) {
    // signIn may still throw a redirect even with redirect:false — treat as success
    if (isRedirectError(error)) {
      return {};
    }
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        // If authorize threw (DB error etc.), the cause has the real message
        const causeMessage = (error.cause as { err?: Error })?.err?.message;
        if (causeMessage) {
          return { error: causeMessage };
        }
        return { error: "Email ou senha incorretos." };
      }
      return { error: error.message || "Erro de autenticação." };
    }
    console.error("[login] unexpected error:", error);
    return { error: "Erro de autenticação. Tente novamente." };
  }
}
