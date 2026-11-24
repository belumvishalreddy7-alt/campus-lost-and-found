'use strict';

const config = require('../config');
const ApiError = require('../utils/ApiError');
const { items, claims, users } = require('../store');
const { publicItem, publicClaim, publicUser, idOf } = require('../utils/serialize');
const { str } = require('../utils/validation');
const { buildFilter, SORTS } = require('./itemController');

/**
 * GET /api/admin/stats - counters and category breakdown for the admin dashboard.
 * Computed in JS from a single projection-free read so the same code works on the
 * Mongo driver and the offline test driver.
 */
async function stats(req, res) {
  const allItems = await items.list({ limit: 5000, sort: { createdAt: -1 } });
  const allClaims = await claims.list({ limit: 5000 });
  const userCount = await users.count({});

  const byCategory = {};
  const byLocation = {};
  const byStatus = { open: 0, claimed: 0, returned: 0 };
  const byType = { lost: 0, found: 0 };
  const last7Days = { lost: 0, found: 0 };
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  allItems.forEach((item) => {
    byCategory[item.category] = (byCategory[item.category] || 0) + 1;
    byLocation[item.location] = (byLocation[item.location] || 0) + 1;
    byStatus[item.status] = (byStatus[item.status] || 0) + 1;
    byType[item.type] = (byType[item.type] || 0) + 1;
    if (new Date(item.createdAt).getTime() >= sevenDaysAgo) last7Days[item.type] += 1;
  });

  const claimStatus = { pending: 0, approved: 0, rejected: 0 };
  allClaims.forEach((claim) => {
    claimStatus[claim.status] = (claimStatus[claim.status] || 0) + 1;
  });

  const topLocations = Object.entries(byLocation)
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const recoveryRate = allItems.length
    ? Math.round(((byStatus.claimed || 0) + (byStatus.returned || 0)) / allItems.length * 100)
    : 0;

  res.json({
    success: true,
    stats: {
      totals: {
        items: allItems.length,
        lost: byType.lost,
        found: byType.found,
        users: userCount,
        claims: allClaims.length,
      },
      byStatus,
      byType,
      byCategory,
      topLocations,
      claims: claimStatus,
      last7Days,
      recoveryRate,
    },
  });
}

/** GET /api/admin/items - every listing with the public search filters (admin). */
async function listItems(req, res) {
  const filter = buildFilter(req.query);
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(config.maxPageSize, Number.parseInt(req.query.limit, 10) || 20);
  const sort = { ...(SORTS[str(req.query.sort).toLowerCase()] || SORTS.newest), _id: -1 };

  const [docs, total] = await Promise.all([
    items.list({
      filter,
      sort,
      skip: (page - 1) * limit,
      limit,
      populate: [{ path: 'postedBy', select: 'username fullName email role' }],
    }),
    items.count(filter),
  ]);

  res.json({
    success: true,
    items: docs.map(publicItem),
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
}

/** GET /api/admin/users - registered accounts (admin). */
async function listUsers(req, res) {
  const docs = await users.list({ limit: 500, sort: { createdAt: -1 } });
  res.json({ success: true, count: docs.length, users: docs.map(publicUser) });
}

/** GET /api/admin/items/:id/claims - all claims for one listing (admin). */
async function itemClaims(req, res) {
  const item = await items.findById(req.params.id);
  if (!item) throw ApiError.notFound('Item not found');
  const docs = await claims.list({
    filter: { item: idOf(item) },
    sort: { createdAt: -1 },
    limit: 100,
    populate: [
      { path: 'item', select: 'title category type status location' },
      { path: 'claimer', select: 'username fullName email role' },
    ],
  });
  res.json({ success: true, claims: docs.map(publicClaim) });
}

module.exports = { stats, listItems, listUsers, itemClaims };
