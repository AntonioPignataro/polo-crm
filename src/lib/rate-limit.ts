/**
 * In-memory sliding-window rate limiter.
 *
 * Shared by the login provider (`lib/auth.ts`) and the change-password action.
 *
 * Limitation, inherited from the original login limiter: on serverless the
 * counters live in the instance's memory, so the ceiling is per warm instance
 * rather than global. It raises the cost of a brute-force attempt without
 * being a hard guarantee — a durable limiter would need Redis or a table.
 */

interface Attempt {
  count: number;
  firstAttempt: number;
}

export interface RateLimiter {
  /** Consumes one attempt. Returns false once the key is over the limit. */
  check(key: string): boolean;
  /** Clears a key's counter — call after a legitimate success. */
  reset(key: string): void;
}

export function createRateLimiter(options: {
  max: number;
  windowMs: number;
  /** How often expired entries are swept, to keep the map from growing. */
  cleanupIntervalMs?: number;
}): RateLimiter {
  const { max, windowMs, cleanupIntervalMs = 5 * 60 * 1000 } = options;
  const attempts = new Map<string, Attempt>();

  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of attempts) {
      if (now - entry.firstAttempt > windowMs) {
        attempts.delete(key);
      }
    }
  }, cleanupIntervalMs);

  // Don't hold the process open just for the sweep (no-op on Edge, where
  // setInterval returns a plain number).
  (timer as { unref?: () => void }).unref?.();

  return {
    check(key: string): boolean {
      const now = Date.now();
      const entry = attempts.get(key);

      if (!entry || now - entry.firstAttempt > windowMs) {
        attempts.set(key, { count: 1, firstAttempt: now });
        return true;
      }

      if (entry.count >= max) {
        return false;
      }

      entry.count++;
      return true;
    },

    reset(key: string): void {
      attempts.delete(key);
    },
  };
}

/** Login attempts, keyed by email. Max 5 per 15 minutes. */
export const loginLimiter = createRateLimiter({
  max: 5,
  windowMs: 15 * 60 * 1000,
});

/**
 * Change-password attempts, keyed by user id. Max 5 per 15 minutes.
 * Stops someone on a hijacked session from brute-forcing the current
 * password in order to lock the real owner out.
 */
export const changePasswordLimiter = createRateLimiter({
  max: 5,
  windowMs: 15 * 60 * 1000,
});

/**
 * "Esqueci minha senha" requests, keyed by email. Max 3 per hour, so the form
 * can't be used to flood someone's inbox (or burn the Resend quota).
 */
export const passwordResetRequestLimiter = createRateLimiter({
  max: 3,
  windowMs: 60 * 60 * 1000,
});

/**
 * Attempts to redeem a reset token, keyed by IP. Tokens are 32 random bytes,
 * so this is belt-and-braces against automated guessing.
 */
export const passwordResetRedeemLimiter = createRateLimiter({
  max: 10,
  windowMs: 15 * 60 * 1000,
});
