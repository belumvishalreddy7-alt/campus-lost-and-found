'use strict';

const config = require('../config');
const ApiError = require('../utils/ApiError');
const { items, claims } = require('../store');
const { validateItemPayload, str } = require('../utils/validation');
const { publicItem, publicClaim, idOf } = require('../utils/serialize');
const { isOwnerOrAdmin } = require('../middleware/auth');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  date_desc: { date: -1 },
  date_asc: { date: 1 },
  title: { title: 1 },
};

/** Build a Mongoose filter from the public query string. */
function buildFilter(query) {
  const filter = {};
  const q = str(query.q || query.search);
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ title: rx }, { description: rx }, { location: rx }];
  }
  if (str(query.category)) filter.category = str(query.category);
  if (str(query.location)) filter.location = new RegExp(`^${escapeRegex(str(query.location))}$`, 'i');

  const type = str(query.type).toLowerCase();
  if (type) {
    if (!['lost', 'found'].includes(type)) throw ApiError.badRequest('type must be "lost" or "found"');
    filter.type = type;
  }

  const status = str(query.status).toLowerCase();
  if (status) {
    if (!config.itemStatuses.includes(status)) {
      throw ApiError.badRequest(`status must be one of: ${config.itemStatuses.join(', ')}`);
    }
    filter.status = status;
  }
  return filter;
}

function parsePaging(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(
    config.maxPageSize,
    Math.max(1, Number.parseInt(query.limit, 10) || config.pageSize)
  );
  return { page, limit, skip: (page - 1) * limit };
}

/**
 * GET /api/items - list, keyword search, filter and sort listings.
 * Query: q, category, location, type, status, sort, page, limit
 */
async function list(req, res) {
  const filter = buildFilter(req.query);
  const { page, limit, skip } = parsePaging(req.query);
  // Secondary key keeps pagination stable when several reports share a timestamp.
  const sort = { ...(SORTS[str(req.query.sort).toLowerCase()] || SORTS.newest), _id: -1 };

  const [docs, total] = await Promise.all([
    items.list({ filter, sort, skip, limit, populate: [{ path: 'postedBy', select: 'username fullName email role' }] }),
    items.count(filter),
  ]);

  res.json({
    success: true,
    items: docs.map(publicItem),
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    appliedFilters: {
      q: str(req.query.q) || null,
      category: str(req.query.category) || null,
      location: str(req.query.location) || null,
      type: str(req.query.type) || null,
      status: str(req.query.status) || null,
      sort: str(req.query.sort) || 'newest',
    },
  });
}

/** GET /api/items/:id - single listing with its pending claim count. */
async function getOne(req, res) {
  const item = await items.findById(req.params.id, {
    populate: [{ path: 'postedBy', select: 'username fullName email role' }],
  });
  if (!item) throw ApiError.notFound('Item not found');

  const pendingClaims = await claims.count({ item: idOf(item), status: 'pending' });
  res.json({ success: true, item: publicItem(item), pendingClaims });
}

/**
 * Extra feature 1 - duplicate-item alert.
 * Before saving a report we look for a recent open listing of the opposite type
 * in the same category and location, and return those as `duplicateWarning`.
 */
async function findDuplicates(payload) {
  const opposite = payload.type === 'lost' ? 'found' : 'lost';
  const from = new Date(payload.date.getTime() - 7 * 24 * 60 * 60 * 1000);
  const to = new Date(payload.date.getTime() + 7 * 24 * 60 * 60 * 1000);

  const matches = await items.list({
    filter: {
      type: opposite,
      category: payload.category,
      location: new RegExp(`^${escapeRegex(payload.location)}$`, 'i'),
      status: 'open',
      date: { $gte: from, $lte: to },
    },
    limit: 3,
  });

  return matches.map((doc) => ({
    id: idOf(doc),
    title: doc.title,
    type: doc.type,
    location: doc.location,
    date: doc.date,
  }));
}

/** POST /api/items - create a lost/found report (protected). */
async function create(req, res) {
  const payload = validateItemPayload(req.body);
  if (req.file) payload.imageUrl = `/uploads/${req.file.filename}`;

  const duplicateWarning = await findDuplicates(payload);
  const item = await items.create({ ...payload, postedBy: req.userId, status: 'open' });

  res.status(201).json({
    success: true,
    message: 'Report created successfully',
    item: publicItem({ ...(item.toObject ? item.toObject() : item), postedBy: req.user }),
    duplicateWarning,
  });
}

/** PUT /api/items/:id - owner or admin updates a listing. */
async function update(req, res) {
  const existing = await items.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Item not found');
  if (!isOwnerOrAdmin(req.user, existing.postedBy)) {
    throw ApiError.forbidden('Only the reporter or an admin can update this listing');
  }

  const payload = validateItemPayload(req.body, { partial: true });
  if (req.file) payload.imageUrl = `/uploads/${req.file.filename}`;
  if (!Object.keys(payload).length) throw ApiError.badRequest('No valid fields supplied to update');
  if (payload.status === 'returned' && !existing.resolvedAt) payload.resolvedAt = new Date();
  if (payload.status && payload.status !== 'returned') payload.resolvedAt = null;

  const updated = await items.updateById(req.params.id, payload);
  res.json({ success: true, message: 'Listing updated successfully', item: publicItem(updated) });
}

/** DELETE /api/items/:id - owner or admin removes a listing and its claims. */
async function remove(req, res) {
  const existing = await items.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Item not found');
  if (!isOwnerOrAdmin(req.user, existing.postedBy)) {
    throw ApiError.forbidden('Only the reporter or an admin can delete this listing');
  }

  await claims.deleteMany({ item: idOf(existing) });
  await items.deleteById(req.params.id);
  res.json({ success: true, message: 'Listing deleted successfully', id: idOf(existing) });
}

/** GET /api/users/me/items - listings created by the logged-in user. */
async function listMine(req, res) {
  const docs = await items.list({
    filter: { postedBy: req.userId },
    sort: { createdAt: -1 },
    limit: config.maxPageSize,
    populate: [{ path: 'postedBy', select: 'username fullName email role' }],
  });
  res.json({ success: true, count: docs.length, items: docs.map(publicItem) });
}

/**
 * GET /api/items/:id/claims - claims on one listing.
 * Visible to the reporter and to admins only.
 */
async function listClaims(req, res) {
  const item = await items.findById(req.params.id);
  if (!item) throw ApiError.notFound('Item not found');
  if (!isOwnerOrAdmin(req.user, item.postedBy)) {
    throw ApiError.forbidden('Only the reporter or an admin can view the claims on this listing');
  }

  const docs = await claims.list({
    filter: { item: idOf(item) },
    sort: { createdAt: -1 },
    limit: 100,
    populate: [{ path: 'claimer', select: 'username fullName email role' }],
  });

  res.json({ success: true, count: docs.length, claims: docs.map(publicClaim) });
}

module.exports = { list, getOne, create, update, remove, listMine, listClaims, buildFilter, SORTS };
