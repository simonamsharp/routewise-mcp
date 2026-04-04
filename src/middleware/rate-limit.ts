import type { Request, Response, NextFunction } from 'express';

/**
 * Simple in-memory rate limiter.
 * Tracks requests per IP within a sliding window.
 *
 * For production, replace with Redis-backed rate limiting.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

export interface RateLimitOptions {
  windowMs: number;     // Time window in milliseconds
  maxRequests: number;  // Max requests per window
}

export function createRateLimiter(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const now = Date.now();

    let entry = store.get(ip);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + options.windowMs };
      store.set(ip, entry);
    }

    entry.count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', options.maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, options.maxRequests - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > options.maxRequests) {
      res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retry_after_seconds: Math.ceil((entry.resetAt - now) / 1000),
      });
      return;
    }

    next();
  };
}
