'use strict';

const mongoose = require('mongoose');
const config = require('../config');

const ItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [120, 'Title must be 120 characters or fewer'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [2000, 'Description must be 2000 characters or fewer'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: { values: config.categories, message: '{VALUE} is not a supported category' },
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      maxlength: [120, 'Location must be 120 characters or fewer'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    type: {
      type: String,
      required: [true, 'Type is required'],
      enum: { values: ['lost', 'found'], message: 'Type must be "lost" or "found"' },
    },
    imageUrl: {
      type: String,
      default: null,
      trim: true,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: { values: config.itemStatuses, message: '{VALUE} is not a valid status' },
      default: 'open',
      index: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes that back the search / filter / sort query patterns used by GET /api/items
ItemSchema.index({ title: 'text', description: 'text' });
ItemSchema.index({ type: 1, status: 1, date: -1 });
ItemSchema.index({ category: 1 });
ItemSchema.index({ location: 1 });
ItemSchema.index({ createdAt: -1 });

ItemSchema.methods.toPublicJSON = function toPublicJSON() {
  const postedBy = this.postedBy;
  return {
    id: String(this._id),
    title: this.title,
    description: this.description,
    category: this.category,
    location: this.location,
    date: this.date,
    type: this.type,
    imageUrl: this.imageUrl || null,
    status: this.status,
    postedBy: postedBy && postedBy.username ? postedBy.toPublicJSON() : String(postedBy || ''),
    resolvedAt: this.resolvedAt || null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.models.Item || mongoose.model('Item', ItemSchema);
