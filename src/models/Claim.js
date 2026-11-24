'use strict';

const mongoose = require('mongoose');
const config = require('../config');

const ClaimSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: [true, 'Item is required'],
      index: true,
    },
    claimer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Claimer is required'],
      index: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: [500, 'Message must be 500 characters or fewer'],
      default: '',
    },
    status: {
      type: String,
      enum: { values: config.claimStatuses, message: '{VALUE} is not a valid claim status' },
      default: 'pending',
      index: true,
    },
    decidedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// A user may only hold one pending claim per item.
ClaimSchema.index({ item: 1, claimer: 1, status: 1 });

ClaimSchema.methods.toPublicJSON = function toPublicJSON() {
  const item = this.item;
  const claimer = this.claimer;
  return {
    id: String(this._id),
    item: item && item.title ? item.toPublicJSON() : String(item || ''),
    claimer: claimer && claimer.username ? claimer.toPublicJSON() : String(claimer || ''),
    message: this.message || '',
    status: this.status,
    decidedAt: this.decidedAt || null,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.models.Claim || mongoose.model('Claim', ClaimSchema);
