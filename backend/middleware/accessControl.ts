/**
 * Access control for Potso API — free/self-hosted friendly.
 * - Optional API key (API_ACCESS_KEY)
 * - In-memory rate limiting
 * - Basic security headers
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function clientKey(req: Request): string {
  const xf = req.headers['x-forwarded-for'];
  const ip =
    (typeof xf === 'string' ? xf.split(',')[0].trim() : '') ||
    req.socket.remoteAddress ||
    'unknown';
  const apiKey = req.headers['x-api-key'] || req.headers['authorization'] || '';
  return `${ip}:${String(apiKey).slice(0, 16)}`;
}

/** Security headers for all responses */
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'microphone=(self), camera=()');
  res.setHeader('X-XSS-Protection', '0');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

/**
 * Rate limit: RATE_LIMIT_MAX requests per RATE_LIMIT_WINDOW_MS (defaults 60/min).
 * Disable with RATE_LIMIT_DISABLED=true
 */
export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  if (process.env.RATE_LIMIT_DISABLED === 'true') return next();

  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
  const max = parseInt(process.env.RATE_LIMIT_MAX || '60', 10);
  const key = clientKey(req);
  const now = Date.now();

  let bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    rateBuckets.set(key, bucket);
  }

  bucket.count += 1;

  res.setHeader('X-RateLimit-Limit', String(max));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

  if (bucket.count > max) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfterMs: bucket.resetAt - now,
    });
  }

  // opportunistic cleanup
  if (rateBuckets.size > 10_000) {
    for (const [k, v] of rateBuckets) {
      if (v.resetAt <= now) rateBuckets.delete(k);
    }
  }

  next();
}

/**
 * When API_ACCESS_KEY is set, require matching key via:
 *   Authorization: Bearer <key>
 *   or X-API-Key: <key>
 * Health remains public when this middleware is not applied to it.
 */
export function apiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.API_ACCESS_KEY;
  if (!expected) {
    // Open mode — suitable for local/LAN trust; production should set a key
    return next();
  }

  const auth = req.headers.authorization;
  const bearer =
    typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')
      ? auth.slice(7).trim()
      : '';
  const headerKey = String(req.headers['x-api-key'] || '').trim();
  const provided = bearer || headerKey;

  if (!provided || provided !== expected) {
    return res.status(401).json({
      error: 'Unauthorized',
      hint: 'Provide Authorization: Bearer <API_ACCESS_KEY> or X-API-Key header',
    });
  }

  next();
}

/** Compose protect stack for sensitive routes */
export const protectApi: RequestHandler[] = [rateLimitMiddleware, apiKeyMiddleware];
