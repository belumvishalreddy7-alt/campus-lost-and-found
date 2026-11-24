
'use strict';

/**
 * MongoDB data store.
 * Mongoose wrapper for Users, Items and Claims.
 */

const mongoose = require('mongoose');

const User = require('../models/User');
const Item = require('../models/Item');
const Claim = require('../models/Claim');

const POPULATE = {
  user: {
    path: 'postedBy',
    select: 'username fullName email role'
  },
  claimItem: {
    path: 'item',
    select: 'title category type status location imageUrl date postedBy'
  },
  claimClaimer: {
    path: 'claimer',
    select: 'username fullName email role'
  }
};

function applyQuery(query, { populate = [] } = {}) {
  populate.forEach((spec) => {
    query = query.populate(spec);
  });

  return query;
}

// MongoDB connection
async function connect(uri) {
  mongoose.set('strictQuery', true);

  const mongoUri = uri || process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error(
      'MONGO_URI is missing. Configure MongoDB Atlas connection string in Render Environment.'
    );
  }

  if (
    process.env.NODE_ENV === 'production' &&
    /127\.0\.0\.1|localhost/i.test(mongoUri)
  ) {
    throw new Error(
      'Production cannot use local MongoDB. Configure your MongoDB Atlas MONGO_URI.'
    );
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000
    });

    console.log('MongoDB connected successfully');
    console.log('MongoDB database:', mongoose.connection.name);

    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    throw error;
  }
}

// Disconnect MongoDB
async function disconnect() {
  await mongoose.disconnect();
}

// USERS
const users = {
  async create(data) {
    return User.create(data);
  },

  async findOne(filter) {
    return User.findOne(filter);
  },

  async findById(id) {
    return User.findById(id);
  },

  async count(filter = {}) {
    return User.countDocuments(filter);
  },

  async list({
    filter = {},
    sort = { createdAt: -1 },
    skip = 0,
    limit = 50
  } = {}) {
    return User.find(filter).sort(sort).skip(skip).limit(limit);
  }
};

// ITEMS
const items = {
  async create(data) {
    return Item.create(data);
  },

  async findById(id, options = {}) {
    return applyQuery(Item.findById(id), options);
  },

  async findOne(filter, options = {}) {
    return applyQuery(Item.findOne(filter), options);
  },

  async list({
    filter = {},
    sort = { createdAt: -1 },
    skip = 0,
    limit = 20,
    populate = []
  } = {}) {
    const query = Item.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    return applyQuery(query, { populate });
  },

  async count(filter = {}) {
    return Item.countDocuments(filter);
  },

  async updateById(id, data) {
    return Item.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true
    });
  },

  async deleteById(id) {
    return Item.findByIdAndDelete(id);
  },

  async deleteMany(filter = {}) {
    return Item.deleteMany(filter);
  }
};

// CLAIMS
const claims = {
  async create(data) {
    return Claim.create(data);
  },

  async findById(id, options = {}) {
    return applyQuery(Claim.findById(id), options);
  },

  async findOne(filter, options = {}) {
    return applyQuery(Claim.findOne(filter), options);
  },

  async list({
    filter = {},
    sort = { createdAt: -1 },
    skip = 0,
    limit = 20,
    populate = []
  } = {}) {
    const query = Claim.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    return applyQuery(query, { populate });
  },

  async count(filter = {}) {
    return Claim.countDocuments(filter);
  },

  async updateById(id, data) {
    return Claim.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true
    });
  },

  async deleteMany(filter = {}) {
    return Claim.deleteMany(filter);
  }
};

module.exports = {
  driver: 'mongo',
  connect,
  disconnect,
  users,
  items,
  claims,
  POPULATE
};
