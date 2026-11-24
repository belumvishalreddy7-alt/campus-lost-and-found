'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const ApiError = require('../utils/ApiError');
const { users } = require('../store');
const { validateSignupPayload, str, isEmail } = require('../utils/validation');
const { publicUser, idOf } = require('../utils/serialize');

const signToken = (user) =>
  jwt.sign({ sub: idOf(user), role: user.role, username: user.username }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

/** POST /api/auth/signup - register a user, hash the password, return a JWT. */
async function signup(req, res) {
  const { username, email, password, fullName } = validateSignupPayload(req.body);

  const existing = await users.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    const field = String(existing.email).toLowerCase() === email ? 'email' : 'username';
    throw ApiError.conflict(`An account with this ${field} already exists`, {
      [field]: `This ${field} is already registered`,
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await users.create({ username, email, fullName, passwordHash, role: 'user' });

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    token: signToken(user),
    user: publicUser(user),
  });
}

/** POST /api/auth/login - verify credentials and return a JWT. */
async function login(req, res) {
  const identifier = str(req.body.email || req.body.username || req.body.identifier);
  const password = String(req.body.password ?? '');

  const errors = {};
  if (!identifier) errors.email = 'Email or username is required';
  if (!password) errors.password = 'Password is required';
  if (Object.keys(errors).length) throw ApiError.badRequest('Validation failed', errors);

  const lookup = isEmail(identifier)
    ? { email: identifier.toLowerCase() }
    : { $or: [{ email: identifier.toLowerCase() }, { username: identifier }] };

  const user = await users.findOne(lookup);
  if (!user) throw ApiError.unauthorized('Invalid email/username or password');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Invalid email/username or password');

  res.status(200).json({
    success: true,
    message: 'Logged in successfully',
    token: signToken(user),
    user: publicUser(user),
  });
}

/** GET /api/auth/me - current user profile (protected). */
async function me(req, res) {
  res.json({ success: true, user: publicUser(req.user) });
}

/** POST /api/auth/logout - JWT is stateless, the client discards the token. */
async function logout(req, res) {
  res.json({ success: true, message: 'Logged out successfully. Discard the token on the client.' });
}

module.exports = { signup, login, me, logout };
