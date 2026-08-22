import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRateLimiter } from '../../server/middleware/rateLimit';
import { Request, Response } from 'express';

describe('Rate Limiter Middleware Security Suite', () => {
  function createMockReqRes(options: {
    ip?: string;
    headers?: Record<string, string>;
    user?: { uid: string };
  }) {
    const req = {
      ip: options.ip || '127.0.0.1',
      headers: options.headers || {},
      socket: { remoteAddress: options.ip || '127.0.0.1' },
      user: options.user,
    } as unknown as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
    } as unknown as Response;

    const next = vi.fn();

    return { req, res, next };
  }

  it('should allow requests within configured threshold', () => {
    const limiter = createRateLimiter({ windowMs: 10000, maxRequests: 3 });

    for (let i = 0; i < 3; i++) {
      const { req, res, next } = createMockReqRes({ ip: '192.168.1.1' });
      limiter(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    }
  });

  it('should block requests exceeding configured threshold with 429', () => {
    const limiter = createRateLimiter({
      windowMs: 10000,
      maxRequests: 2,
      message: 'Quota exceeded',
    });

    const { req: req1, res: res1, next: next1 } = createMockReqRes({ ip: '10.0.0.5' });
    limiter(req1, res1, next1);
    expect(next1).toHaveBeenCalledTimes(1);

    const { req: req2, res: res2, next: next2 } = createMockReqRes({ ip: '10.0.0.5' });
    limiter(req2, res2, next2);
    expect(next2).toHaveBeenCalledTimes(1);

    // 3rd request should be blocked
    const { req: req3, res: res3, next: next3 } = createMockReqRes({ ip: '10.0.0.5' });
    limiter(req3, res3, next3);
    expect(next3).not.toHaveBeenCalled();
    expect(res3.status).toHaveBeenCalledWith(429);
    expect(res3.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Quota exceeded' })
    );
  });

  it('should not allow rate limit bypass via spoofed X-Forwarded-For headers', () => {
    const limiter = createRateLimiter({ windowMs: 10000, maxRequests: 1 });

    // Request 1 from client IP 10.0.0.1
    const { req: req1, res: res1, next: next1 } = createMockReqRes({
      ip: '10.0.0.1',
      headers: { 'x-forwarded-for': '1.2.3.4' },
    });
    limiter(req1, res1, next1);
    expect(next1).toHaveBeenCalledTimes(1);

    // Request 2 with same socket IP but spoofed header
    const { req: req2, res: res2, next: next2 } = createMockReqRes({
      ip: '10.0.0.1',
      headers: { 'x-forwarded-for': '5.6.7.8' },
    });
    limiter(req2, res2, next2);

    // Should be blocked because limiter tracks verified req.ip
    expect(next2).not.toHaveBeenCalled();
    expect(res2.status).toHaveBeenCalledWith(429);
  });
});
