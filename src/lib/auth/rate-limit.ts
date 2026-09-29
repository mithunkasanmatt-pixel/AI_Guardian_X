/**
 * Simple rate limiter helper to prevent brute-force login attempts
 */
interface RateLimitRecord {
  attempts: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000
): { allowed: boolean; remaining: number; resetTimeMs: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, {
      attempts: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true, remaining: maxAttempts - 1, resetTimeMs: windowMs };
  }

  if (record.attempts >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetTimeMs: record.resetAt - now,
    };
  }

  record.attempts += 1;
  rateLimitMap.set(identifier, record);

  return {
    allowed: true,
    remaining: maxAttempts - record.attempts,
    resetTimeMs: record.resetAt - now,
  };
}

export function resetRateLimit(identifier: string) {
  rateLimitMap.delete(identifier);
}
