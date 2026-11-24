'use strict';

const rateLimit = require('express-rate-limit');

/** Throttle brute-force attempts against the auth endpoints. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
});

module.exports = { authLimiter };
