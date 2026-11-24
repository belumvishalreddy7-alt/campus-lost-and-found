'use strict';

/**
 * In-memory data store - OFFLINE TEST / DEMO DRIVER ONLY.
 *
 * The application's production data store is MongoDB through Mongoose (./mongo.js).
 * This module implements the same small async interface over plain arrays so that
 * the automated test suite (and a demo run on a machine without MongoDB) can exercise
 * every route. It is selected only when DB_DRIVER=memory.
 */
const { randomBytes } = require('crypto');

const collections = { users: [], items: [], claims: [] };

const newId = () => randomBytes(12).toString('hex');
const clone = (doc) => (doc ? JSON.parse(JSON.stringify(doc)) : doc);

function getPath(doc, path) {
  return path.split('.').reduce((acc, key) => (acc === undefined || acc === null ? acc : acc[key]), doc);
}

function matchValue(value, condition) {
  if (condition instanceof RegExp) return condition.test(String(value ?? ''));
  if (condition && typeof condition === 'object' && !Array.isArray(condition)) {
    if ('$in' in condition) return condition.$in.some((v) => String(v) === String(value));
    if ('$ne' in condition) return String(value) !== String(condition.$ne);
    if ('$regex' in condition) {
      return new RegExp(condition.$regex, condition.$options || '').test(String(value ?? ''));
    }
    if ('$gte' in condition || '$lte' in condition || '$gt' in condition || '$lt' in condition) {
      const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
      if ('$gte' in condition && !(time >= new Date(condition.$gte).getTime())) return false;
      if ('$lte' in condition && !(time <= new Date(condition.$lte).getTime())) return false;
      if ('$gt' in condition && !(time > new Date(condition.$gt).getTime())) return false;
      if ('$lt' in condition && !(time < new Date(condition.$lt).getTime())) return false;
      return true;
    }
    return false;
  }
  if (condition === null) return value === null || value === undefined;
  return String(value) === String(condition);
}

function matches(doc, filter = {}) {
  return Object.entries(filter).every(([key, condition]) => {
    if (key === '$or') return condition.some((sub) => matches(doc, sub));
    if (key === '$and') return condition.every((sub) => matches(doc, sub));
    return matchValue(getPath(doc, key), condition);
  });
}

function sortDocs(docs, sort = {}) {
  const entries = Object.entries(sort);
  if (!entries.length) return docs;
  return [...docs].sort((a, b) => {
    for (const [field, direction] of entries) {
      const left = getPath(a, field);
      const right = getPath(b, field);
      const lv = left instanceof Date ? left.getTime() : left;
      const rv = right instanceof Date ? right.getTime() : right;
      if (lv === rv) continue;
      if (lv === undefined || lv === null) return 1;
      if (rv === undefined || rv === null) return -1;
      return (lv < rv ? -1 : 1) * (direction < 0 ? -1 : 1);
    }
    return 0;
  });
}

function populateDocs(docs, populate = []) {
  return docs.map((doc) => {
    const copy = clone(doc);
    populate.forEach(({ path, select }) => {
      const ref = getPath(copy, path);
      if (!ref) return;
      const refId = ref && ref._id ? ref._id : ref;
      const collectionName = path === 'item' ? 'items' : 'users';
      const target = collections[collectionName].find((d) => String(d._id) === String(refId));
      if (!target) {
        copy[path] = null;
        return;
      }
      const fields = select ? select.split(' ') : Object.keys(target);
      const picked = { _id: target._id };
      fields.forEach((field) => {
        picked[field] = target[field];
      });
      copy[path] = picked;
    });
    return copy;
  });
}

function makeCrud(name) {
  return {
    async create(data) {
      const now = new Date();
      const doc = { _id: newId(), ...clone(data), createdAt: now, updatedAt: now };
      collections[name].push(doc);
      return clone(doc);
    },
    async findOne(filter = {}, options = {}) {
      const found = collections[name].filter((doc) => matches(doc, filter)).slice(0, 1);
      return populateDocs(found, options.populate)[0] || null;
    },
    async findById(id, options = {}) {
      const found = collections[name].filter((doc) => String(doc._id) === String(id)).slice(0, 1);
      return populateDocs(found, options.populate)[0] || null;
    },
    async list({ filter = {}, sort = { createdAt: -1 }, skip = 0, limit = 20, populate = [] } = {}) {
      const filtered = collections[name].filter((doc) => matches(doc, filter));
      const sorted = sortDocs(filtered, sort).slice(skip, skip + limit);
      return populateDocs(sorted, populate);
    },
    async count(filter = {}) {
      return collections[name].filter((doc) => matches(doc, filter)).length;
    },
    async updateById(id, data) {
      const doc = collections[name].find((d) => String(d._id) === String(id));
      if (!doc) return null;
      Object.assign(doc, clone(data), { updatedAt: new Date() });
      return clone(doc);
    },
    async deleteById(id) {
      const index = collections[name].findIndex((d) => String(d._id) === String(id));
      if (index === -1) return null;
      return collections[name].splice(index, 1)[0];
    },
    async deleteMany(filter = {}) {
      const before = collections[name].length;
      collections[name] = collections[name].filter((doc) => !matches(doc, filter));
      return { deletedCount: before - collections[name].length };
    },
  };
}

const users = {
  ...makeCrud('users'),
  async list({ filter = {}, sort = { createdAt: -1 }, skip = 0, limit = 50 } = {}) {
    const filtered = collections.users.filter((doc) => matches(doc, filter));
    return clone(sortDocs(filtered, sort).slice(skip, skip + limit));
  },
};

async function connect() {
  return { driver: 'memory' };
}

async function disconnect() {
  return true;
}

function reset() {
  collections.users.length = 0;
  collections.items.length = 0;
  collections.claims.length = 0;
}

module.exports = {
  driver: 'memory',
  connect,
  disconnect,
  reset,
  collections,
  users,
  items: makeCrud('items'),
  claims: makeCrud('claims'),
  POPULATE: {},
};
