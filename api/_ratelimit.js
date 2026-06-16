import { Redis } from '@upstash/redis';

let redis = null;
try {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  }
} catch (e) {
  redis = null;
}

// Best-effort client IP from common proxy headers.
export function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

/**
 * Fixed-window rate limiter.
 * Returns { allowed, remaining, retryAfter }.
 * Fails OPEN: if Redis is unavailable, requests are allowed so a cache
 * outage never locks legitimate users out of the app.
 */
export async function rateLimit(key, { limit = 10, windowSec = 60 } = {}) {
  if (!redis) return { allowed: true, remaining: limit, retryAfter: 0 };
  const redisKey = `rl:${key}`;
  try {
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSec);
    }
    if (count > limit) {
      let ttl = await redis.ttl(redisKey);
      if (ttl < 0) ttl = windowSec;
      return { allowed: false, remaining: 0, retryAfter: ttl };
    }
    return { allowed: true, remaining: Math.max(0, limit - count), retryAfter: 0 };
  } catch (e) {
    // Fail open on any Redis error.
    return { allowed: true, remaining: limit, retryAfter: 0 };
  }
}

// Helper to send a standard 429 response.
export function tooMany(res, retryAfter) {
  res.setHeader('Retry-After', String(retryAfter || 60));
  return res.status(429).json({
    ok: false,
    error: `Too many attempts. Please try again in ${retryAfter || 60} seconds.`,
  });
}
