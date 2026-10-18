import rateLimit from 'express-rate-limit';

/**
 * Strict rate limiter for authentication routes to mitigate brute force attacks
 * Max 15 attempts per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false, xForwardedForHeader: false },
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
    data: null,
  },
});

/**
 * AI endpoint rate limiter to prevent Gemini API quota exhaustion
 * Max 30 requests per hour per user / IP
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => {
    const user = (req as any).user;
    return user?._id ? user._id.toString() : (req.ip || 'anonymous');
  },
  message: {
    success: false,
    message: 'AI generation quota reached for this hour. Please wait a bit before submitting more requests.',
    data: null,
  },
});

/**
 * Baseline general API rate limiter
 * Max 120 requests per minute per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false, xForwardedForHeader: false },
  message: {
    success: false,
    message: 'Too many requests. Please throttle your traffic.',
    data: null,
  },
});
