import { Request, Response, NextFunction } from "express";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: { windowMs: number; maxRequests: number; message?: string }) {
  const { windowMs, maxRequests, message = "Too many requests. Please slow down." } = options;
  const ipMap = new Map<string, RateLimitRecord>();

  // Periodically clean up expired entries
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of ipMap.entries()) {
      if (now > record.resetAt) {
        ipMap.delete(key);
      }
    }
  }, Math.max(windowMs, 30000));

  return (req: Request, res: Response, next: NextFunction) => {
    const clientKey = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown_client";
    const now = Date.now();

    const record = ipMap.get(clientKey);
    if (!record || now > record.resetAt) {
      ipMap.set(clientKey, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfter.toString());
      return res.status(429).json({
        error: message,
        retryAfterSeconds: retryAfter,
      });
    }

    record.count += 1;
    next();
  };
}
