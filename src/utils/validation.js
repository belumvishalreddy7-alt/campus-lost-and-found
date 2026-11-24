'use strict';

const config = require('../config');
const ApiError = require('./ApiError');

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || ''));
const isHttpUrl = (value) => /^https?:\/\/\S+$/i.test(String(value || ''));

/** Trim and coerce a value to a plain string ('' when absent). */
const str = (value) => (value === undefined || value === null ? '' : String(value).trim());

/**
 * Validate an item payload for create/update.
 * @param {object} body request body
 * @param {{partial?: boolean}} options partial=true skips required checks (PATCH/PUT semantics)
 * @returns {object} the sanitised fields
 */
function validateItemPayload(body = {}, { partial = false } = {}) {
  const errors = {};
  const out = {};

  const has = (key) => body[key] !== undefined && body[key] !== null && String(body[key]).trim() !== '';

  if (!partial || has('title')) {
    const title = str(body.title);
    if (title.length < 3) errors.title = 'Title must be at least 3 characters long';
    else if (title.length > 120) errors.title = 'Title must be 120 characters or fewer';
    else out.title = title;
  }

  if (!partial || has('description')) {
    const description = str(body.description);
    if (description.length < 10) errors.description = 'Description must be at least 10 characters long';
    else if (description.length > 2000) errors.description = 'Description must be 2000 characters or fewer';
    else out.description = description;
  }

  if (!partial || has('category')) {
    const category = str(body.category);
    if (!config.categories.includes(category)) {
      errors.category = `Category must be one of: ${config.categories.join(', ')}`;
    } else out.category = category;
  }

  if (!partial || has('location')) {
    const location = str(body.location);
    if (location.length < 2) errors.location = 'Location is required (campus building or area)';
    else if (location.length > 120) errors.location = 'Location must be 120 characters or fewer';
    else out.location = location;
  }

  if (!partial || has('date')) {
    const raw = body.date;
    const date = raw ? new Date(raw) : null;
    if (!date || Number.isNaN(date.getTime())) {
      errors.date = 'A valid date is required (YYYY-MM-DD)';
    } else if (date.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
      errors.date = 'Date cannot be in the future';
    } else out.date = date;
  }

  if (!partial || has('type')) {
    const type = str(body.type).toLowerCase();
    if (!['lost', 'found'].includes(type)) errors.type = 'Type must be either "lost" or "found"';
    else out.type = type;
  }

  if (has('imageUrl')) {
    const imageUrl = str(body.imageUrl);
    if (!isHttpUrl(imageUrl)) errors.imageUrl = 'Image URL must start with http:// or https://';
    else out.imageUrl = imageUrl;
  }

  if (has('status')) {
    const status = str(body.status).toLowerCase();
    if (!config.itemStatuses.includes(status)) {
      errors.status = `Status must be one of: ${config.itemStatuses.join(', ')}`;
    } else out.status = status;
  }

  if (Object.keys(errors).length) {
    throw ApiError.badRequest('Validation failed', errors);
  }
  return out;
}

/** Validate signup input. */
function validateSignupPayload(body = {}) {
  const errors = {};
  const out = {};

  const username = str(body.username);
  if (username.length < 3) errors.username = 'Username must be at least 3 characters';
  else if (username.length > 30) errors.username = 'Username must be 30 characters or fewer';
  else if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
    errors.username = 'Username may only contain letters, numbers, dot, underscore or hyphen';
  } else out.username = username;

  const email = str(body.email).toLowerCase();
  if (!isEmail(email)) errors.email = 'A valid email address is required';
  else out.email = email;

  const password = String(body.password ?? '');
  if (password.length < 6) errors.password = 'Password must be at least 6 characters';
  else if (password.length > 72) errors.password = 'Password must be 72 characters or fewer';
  else out.password = password;

  const fullName = str(body.fullName);
  if (fullName.length > 60) errors.fullName = 'Full name must be 60 characters or fewer';
  else out.fullName = fullName || username;

  if (Object.keys(errors).length) {
    throw ApiError.badRequest('Validation failed', errors);
  }
  return out;
}

module.exports = { isEmail, isHttpUrl, validateItemPayload, validateSignupPayload, str };
