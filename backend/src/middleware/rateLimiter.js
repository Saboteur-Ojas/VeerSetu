const rateLimit = require('express-rate-limit');

const environment = require('../config/environment');

// Stricter limiter for authentication and help-request endpoints.
const authLimiter = rateLimit({
  windowMs: environment.rateLimit.windowMs,
  max: Math.min(environment.rateLimit.max, 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many attempts. Please try again later.',
  },
});

// General API limiter.
const apiLimiter = rateLimit({
  windowMs: environment.rateLimit.windowMs,
  max: environment.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many requests. Please slow down.',
  },
});

module.exports = { authLimiter, apiLimiter };