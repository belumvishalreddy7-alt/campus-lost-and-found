'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const ApiError = require('../utils/ApiError');
const { users } = require('../store');
const { idOf } = require('../utils/serialize');

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

/** Verify the JWT and attach the matching user document to req.user. */
async function authenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) return next(ApiError.unauthorized('No token provided'));

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await users.findById(payload.sub);
    if (!user) return next(ApiError.unauthorized('User for this token no longer exists'));
    req.user = user;
    req.userId = idOf(user);
    return next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid or malformed token';
    return next(ApiError.unauthorized(message));
  }
}

/** Attach req.user when a valid token is present, but never block the request. */
async function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await users.findById(payload.sub);
    if (user) {
      req.user = user;
      req.userId = idOf(user);
    }
  } catch (err) {
    // ignore - treat as anonymous visitor
  }
  return next();
}

/** Allow only users with the admin role. Must run after authenticate. */
function requireAdmin(req, res, next) {
  if (!req.user) return next(ApiError.unauthorized('Authentication required'));
  if (req.user.role !== 'admin') return next(ApiError.forbidden('Admin privileges required'));
  return next();
}

/** Owner of the record, or any admin, may proceed. */
function isOwnerOrAdmin(user, ownerId) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return idOf(user) === idOf(ownerId);
}

module.exports = { authenticate, optionalAuth, requireAdmin, isOwnerOrAdmin };
