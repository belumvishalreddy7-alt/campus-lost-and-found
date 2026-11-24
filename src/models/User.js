'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username must be 30 characters or fewer'],
      match: [/^[a-zA-Z0-9._-]+$/, 'Username may only contain letters, numbers, dot, underscore or hyphen'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Email is not valid'],
    },
    fullName: {
      type: String,
      trim: true,
      maxlength: [60, 'Full name must be 60 characters or fewer'],
      default: '',
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });

/** Hash a plain password with bcrypt (never store the raw value). */
UserSchema.statics.hashPassword = function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
};

/** Compare a candidate password against the stored bcrypt hash. */
UserSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

UserSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: String(this._id),
    username: this.username,
    fullName: this.fullName || this.username,
    email: this.email,
    role: this.role,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
