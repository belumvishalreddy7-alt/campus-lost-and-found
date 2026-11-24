'use strict';

const config = require('../config');
const ApiError = require('../utils/ApiError');

/** 404 for unmatched routes. */
function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/** Central error handler - every error leaves the API in the same JSON shape. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  // Mongoose validation errors -> 400 with per-field messages
  if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    message = 'Validation failed';
    details = Object.fromEntries(Object.entries(err.errors).map(([field, e]) => [field, e.message]));
  }

  // Invalid ObjectId / cast failures -> 400
  if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for ${err.path}`;
  }

  // Unique index violations -> 409
  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || err.keyValue || { field: 1 })[0];
    message = `An account or record with this ${field} already exists`;
    details = { [field]: message };
  }

  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON';
  }

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }

  const body = { success: false, message };
  if (details) body.errors = details;
  if (config.env === 'development' && status >= 500) body.stack = err.stack;

  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
