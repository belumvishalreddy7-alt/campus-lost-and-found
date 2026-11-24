'use strict';

/**
 * Wraps an async route handler so rejected promises reach the Express error handler
 * instead of crashing the process. Keeps controllers free of try/catch noise.
 */
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
