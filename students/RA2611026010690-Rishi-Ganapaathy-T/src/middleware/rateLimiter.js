/**
 * Rate Limiting Middleware
 * Protects against brute-force attacks and denial of service.
 */

const rateLimit = require('express-rate-limit');
const env = require('../config/env');

// General API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS, // 15 minutes
  max: env.RATE_LIMIT_MAX, // limit each IP to max requests per windowMs
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please wait a few moments before trying again.',
  },
});

// Stricter limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // max 30 login attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Too many authentication attempts. Please wait 15 minutes.',
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
};

