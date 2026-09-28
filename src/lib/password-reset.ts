import { createHash, randomBytes, randomInt } from "crypto";

/** How long a reset link stays valid. */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Only the hash of a reset token is ever persisted. The raw token exists in
 * the email link and nowhere else, so read access to `password_reset_tokens`
 * does not let anyone take over an account.
 */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateResetToken(): { token: string; tokenHash: string } {
  // 32 random bytes — not guessable, and base64url is safe in a query string.
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashResetToken(token) };
}

const TEMP_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O — misread over WhatsApp
const TEMP_DIGITS = "23456789"; // no 0/1 for the same reason

/**
 * A temporary password a director can read out or paste into WhatsApp.
 * Always satisfies the shared password policy (length, letter, digit).
 */
export function generateTempPassword(): string {
  const letters = Array.from(
    { length: 4 },
    () => TEMP_LETTERS[randomInt(TEMP_LETTERS.length)]
  ).join("");
  const digits = Array.from(
    { length: 4 },
    () => TEMP_DIGITS[randomInt(TEMP_DIGITS.length)]
  ).join("");
  return `Polo${letters}${digits}`;
}
