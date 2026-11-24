'use strict';

/**
 * Application level error with an HTTP status code.
 * Thrown by controllers/middleware and rendered by the central error handler.
 */
class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    if (details) this.details = details;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message = 'Invalid request', details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'You are not allowed to perform this action') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Request conflicts with existing data') {
    return new ApiError(409, message);
  }
}

module.exports = ApiError;
