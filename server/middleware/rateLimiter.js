const rateLimit = require('express-rate-limit');

// General API Rate Limiter: 300 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    success: false,
    message: 'Too many requests from this IP address. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter Auth Limiter: 40 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: {
    success: false,
    message: 'Too many login or registration attempts. Please wait 15 minutes before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { apiLimiter, authLimiter };
