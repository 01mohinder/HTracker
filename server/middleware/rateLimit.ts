import { Request, Response, NextFunction } from "express";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}) {
  const {
    windowMs,
    maxRequests,
    message = "Too many requests. Please slow down.",
    keyGenerator,
  } = options;
  const trackingMap = new Map<string, RateLimitRecord>();

  // Periodically clean up expired entries
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of trackingMap.entries()) {
      if (now > record.resetAt) {
        trackingMap.delete(key);
      }
    }
  }, Math.max(windowMs, 30000));

  // Allow Node process to exit cleanly in tests
  if (interval.unref) {
    interval.unref();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    let clientKey: string;
    if (keyGenerator) {
      clientKey = keyGenerator(req);
    } else {
      const authUserUid = (req as any).user?.uid;
      // Use Express validated req.ip (configured via app.set('trust proxy', true))
      // rather than blindly trusting the raw leftmost X-Forwarded-For header
      const clientIp = req.ip || req.socket?.remoteAddress || "127.0.0.1";
      clientKey = authUserUid ? `user:${authUserUid}` : `ip:${clientIp}`;
    }

    const now = Date.now();
    const record = trackingMap.get(clientKey);

    if (!record || now > record.resetAt) {
      trackingMap.set(clientKey, { count: 1, resetAt: now + windowMs });
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
