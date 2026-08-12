import { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from '../utils/logger.js';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const ipCache = new Map<string, RateLimitRecord>();

export interface RateLimiterOptions {
  windowMs: number;    // default: 15 minutes (900000ms)
  maxRequests: number; // default: 100 requests
}

export function createRateLimiter(options: RateLimiterOptions): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const now = Date.now();

    let record = ipCache.get(ip);

    if (!record || now > record.resetAt) {
      record = {
        count: 1,
        resetAt: now + options.windowMs,
      };
      ipCache.set(ip, record);
      return next();
    }

    record.count++;

    if (record.count > options.maxRequests) {
      logger.warn({ ip, count: record.count }, 'Rate limit exceeded for client IP');
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Excessive requests detected. Please slow down and try again later.',
        retryAfterMs: record.resetAt - now,
      });
      return;
    }

    next();
  };
}
