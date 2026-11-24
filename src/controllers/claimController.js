'use strict';

const config = require('../config');
const ApiError = require('../utils/ApiError');
const { items, claims } = require('../store');
const { str } = require('../utils/validation');
const { publicClaim, publicItem, idOf } = require('../utils/serialize');
const { isOwnerOrAdmin } = require('../middleware/auth');

const ITEM_POPULATE = [
  { path: 'item', select: 'title category type status location imageUrl date postedBy' },
  { path: 'claimer', select: 'username fullName email role' },
];

/** POST /api/claims - submit a claim on a found item (protected). */
async function create(req, res) {
  const itemId = str(req.body.itemId || req.body.item);
  const message = str(req.body.message);

  if (!itemId) throw ApiError.badRequest('Validation failed', { itemId: 'itemId is required' });
  if (message.length > 500) throw ApiError.badRequest('Validation failed', { message: 'Message must be 500 characters or fewer' });

  const item = await items.findById(itemId);
  if (!item) throw ApiError.notFound('Item not found');
  if (item.type !== 'found') throw ApiError.badRequest('Claims can only be submitted for items reported as found');
  if (idOf(item.postedBy) === req.userId) throw ApiError.badRequest('You cannot claim an item you reported yourself');
  if (item.status !== 'open') throw ApiError.badRequest('This item is no longer open for claims');

  const existing = await claims.findOne({ item: idOf(item), claimer: req.userId, status: 'pending' });
  if (existing) throw ApiError.conflict('You already have a pending claim on this item');

  const claim = await claims.create({ item: idOf(item), claimer: req.userId, message, status: 'pending' });
  res.status(201).json({
    success: true,
    message: 'Claim submitted. The reporter or an admin will review it.',
    claim: publicClaim({ ...(claim.toObject ? claim.toObject() : claim), item, claimer: req.user }),
  });
}

/** GET /api/claims/mine - claims I made and claims received on my listings. */
async function listMine(req, res) {
  const [made, myItems] = await Promise.all([
    claims.list({ filter: { claimer: req.userId }, sort: { createdAt: -1 }, limit: 100, populate: ITEM_POPULATE }),
    items.list({ filter: { postedBy: req.userId }, limit: 200 }),
  ]);
  const myItemIds = myItems.map(idOf);
  const received = myItemIds.length
    ? await claims.list({
        filter: { item: { $in: myItemIds } },
        sort: { createdAt: -1 },
        limit: 100,
        populate: ITEM_POPULATE,
      })
    : [];

  res.json({
    success: true,
    made: made.map(publicClaim),
    received: received.map(publicClaim),
  });
}

/** GET /api/claims/:id - claimer, item owner or admin. */
async function getOne(req, res) {
  const claim = await claims.findById(req.params.id, { populate: ITEM_POPULATE });
  if (!claim) throw ApiError.notFound('Claim not found');

  const itemOwner = claim.item && claim.item.postedBy ? claim.item.postedBy : null;
  const allowed =
    isOwnerOrAdmin(req.user, claim.claimer) ||
    isOwnerOrAdmin(req.user, itemOwner) ||
    String(idOf(claim.claimer)) === req.userId;

  if (!allowed) throw ApiError.forbidden('You are not allowed to view this claim');
  res.json({ success: true, claim: publicClaim(claim) });
}

/** PATCH /api/claims/:id - approve or reject a claim (item owner or admin). */
async function decide(req, res) {
  const status = str(req.body.status).toLowerCase();
  if (!['approved', 'rejected'].includes(status)) {
    throw ApiError.badRequest('Validation failed', { status: 'status must be "approved" or "rejected"' });
  }

  const claim = await claims.findById(req.params.id, { populate: ITEM_POPULATE });
  if (!claim) throw ApiError.notFound('Claim not found');

  const itemId = claim.item && claim.item._id ? idOf(claim.item) : idOf(claim.item);
  const item = await items.findById(itemId);
  if (!item) throw ApiError.notFound('Item for this claim no longer exists');

  if (!isOwnerOrAdmin(req.user, item.postedBy)) {
    throw ApiError.forbidden('Only the reporter of the item or an admin can decide on claims');
  }
  if (claim.status !== 'pending') throw ApiError.badRequest(`This claim has already been ${claim.status}`);

  const updated = await claims.updateById(req.params.id, { status, decidedAt: new Date() });

  if (status === 'approved') {
    // The item is recovered: mark it claimed and auto-reject the competing claims.
    await items.updateById(itemId, { status: 'claimed' });
    const others = await claims.list({ filter: { item: itemId, status: 'pending' }, limit: 100 });
    await Promise.all(
      others.map((other) => claims.updateById(idOf(other), { status: 'rejected', decidedAt: new Date() }))
    );
  }

  res.json({
    success: true,
    message: `Claim ${status} successfully`,
    claim: publicClaim({ ...(updated.toObject ? updated.toObject() : updated), item, claimer: claim.claimer }),
  });
}

/** GET /api/admin/claims - every claim (admin). */
async function listAll(req, res) {
  const filter = {};
  const status = str(req.query.status).toLowerCase();
  if (status) {
    if (!config.claimStatuses.includes(status)) throw ApiError.badRequest('Invalid claim status filter');
    filter.status = status;
  }
  const { page, limit, skip } = {
    page: Math.max(1, Number.parseInt(req.query.page, 10) || 1),
    limit: Math.min(config.maxPageSize, Number.parseInt(req.query.limit, 10) || 20),
    skip: 0,
  };
  const offset = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    claims.list({ filter, sort: { createdAt: -1 }, skip: offset, limit, populate: ITEM_POPULATE }),
    claims.count(filter),
  ]);

  res.json({
    success: true,
    claims: docs.map(publicClaim),
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)), skip },
  });
}

module.exports = { create, listMine, getOne, decide, listAll };
