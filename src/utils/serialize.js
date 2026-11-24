'use strict';

/** Convert a Mongoose document or a plain store record into an API-safe object. */
const idOf = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  return String(value);
};

const publicUser = (user) => {
  if (!user) return null;
  return {
    id: idOf(user),
    username: user.username,
    fullName: user.fullName || user.username,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
};

const publicItem = (item) => {
  if (!item) return null;
  const postedBy = item.postedBy;
  return {
    id: idOf(item),
    title: item.title,
    description: item.description,
    category: item.category,
    location: item.location,
    date: item.date,
    type: item.type,
    imageUrl: item.imageUrl || null,
    status: item.status,
    postedBy: postedBy && postedBy.username ? publicUser(postedBy) : idOf(postedBy),
    resolvedAt: item.resolvedAt || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

const publicClaim = (claim) => {
  if (!claim) return null;
  const item = claim.item;
  const claimer = claim.claimer;
  return {
    id: idOf(claim),
    item: item && item.title ? publicItem(item) : idOf(item),
    claimer: claimer && claimer.username ? publicUser(claimer) : idOf(claimer),
    message: claim.message || '',
    status: claim.status,
    decidedAt: claim.decidedAt || null,
    createdAt: claim.createdAt,
  };
};

module.exports = { idOf, publicUser, publicItem, publicClaim };
