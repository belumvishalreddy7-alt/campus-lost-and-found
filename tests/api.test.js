'use strict';

/**
 * API test suite - mirrors the Postman collection (postman/).
 * Runs against the offline in-memory driver so it needs no MongoDB instance:
 *   npm run test:offline
 * Against a real database (CI with MongoDB):
 *   MONGO_URI=mongodb://127.0.0.1:27017/campus_lost_found_test npm test
 */
process.env.NODE_ENV = 'test';
process.env.DB_DRIVER = process.env.DB_DRIVER || 'memory';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-automated-tests';
process.env.SEED_ON_START = 'false';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const store = require('../src/store');
const { seedDatabase } = require('../src/utils/seedData');

const ctx = {};

test.before(async () => {
  await store.connect();
  await seedDatabase({ reset: true });

  const admin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@campus.edu', password: 'Admin@123' });
  ctx.adminToken = admin.body.token;

  const student = await request(app)
    .post('/api/auth/login')
    .send({ email: 'priya.sharma@campus.edu', password: 'Student@123' });
  ctx.studentToken = student.body.token;
  ctx.studentId = student.body.user.id;

  const other = await request(app)
    .post('/api/auth/login')
    .send({ email: 'arjun.rao@campus.edu', password: 'Student@123' });
  ctx.otherToken = other.body.token;
});

test.after(async () => {
  await store.disconnect();
});

test('TC01 POST /api/auth/signup creates a user and returns a JWT (201)', async () => {
  const res = await request(app).post('/api/auth/signup').send({
    username: 'test.user',
    email: 'test.user@campus.edu',
    password: 'Secret@123',
    fullName: 'Test User',
  });
  assert.equal(res.status, 201);
  assert.ok(res.body.token, 'token should be present');
  assert.equal(res.body.user.username, 'test.user');
  assert.equal(res.body.user.passwordHash, undefined, 'password hash must never be returned');
});

test('TC02 POST /api/auth/signup rejects a duplicate email (409)', async () => {
  const res = await request(app).post('/api/auth/signup').send({
    username: 'someone.else',
    email: 'test.user@campus.edu',
    password: 'Secret@123',
  });
  assert.equal(res.status, 409);
  assert.equal(res.body.success, false);
});

test('TC03 POST /api/auth/signup rejects invalid input (400)', async () => {
  const res = await request(app).post('/api/auth/signup').send({ username: 'ab', email: 'not-an-email' });
  assert.equal(res.status, 400);
  assert.ok(res.body.errors.password, 'password error expected');
  assert.ok(res.body.errors.email, 'email error expected');
});

test('TC04 POST /api/auth/login returns a token for valid credentials (200)', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'belumvishalreddy7@gmail.com', password: 'Student@123' });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.equal(res.body.user.role, 'user');
});

test('TC05 POST /api/auth/login rejects a wrong password (401)', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'belumvishalreddy7@gmail.com', password: 'wrong-password' });
  assert.equal(res.status, 401);
  assert.match(res.body.message, /Invalid/i);
});

test('TC06 POST /api/items without a token is rejected (401)', async () => {
  const res = await request(app).post('/api/items').send({
    title: 'Unauthorised item',
    description: 'This request has no bearer token and must be rejected.',
    category: 'Other',
    location: 'Central Library',
    date: '2026-11-08',
    type: 'lost',
  });
  assert.equal(res.status, 401);
});

test('TC07 POST /api/items creates a listing for the logged-in user (201)', async () => {
  const res = await request(app)
    .post('/api/items')
    .set('Authorization', `Bearer ${ctx.studentToken}`)
    .send({
      title: 'Brown Leather Journal',
      description: 'Lost my brown leather journal with handwritten notes in the reading hall.',
      category: 'Books & Stationery',
      location: 'Central Library',
      date: '2026-11-06',
      type: 'lost',
    });
  assert.equal(res.status, 201);
  assert.equal(res.body.item.title, 'Brown Leather Journal');
  assert.equal(res.body.item.status, 'open');
  ctx.createdItemId = res.body.item.id;
});

test('TC08 POST /api/items validates the payload (400)', async () => {
  const res = await request(app)
    .post('/api/items')
    .set('Authorization', `Bearer ${ctx.studentToken}`)
    .send({
      title: 'Ok',
      description: 'short',
      category: 'Spaceship Parts',
      location: '',
      date: 'not-a-date',
      type: 'borrowed',
    });
  assert.equal(res.status, 400);
  assert.ok(res.body.errors.category);
  assert.ok(res.body.errors.type);
});

test('TC09 GET /api/items returns the seeded listings with pagination (200)', async () => {
  const res = await request(app).get('/api/items').query({ limit: 50 });
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.items));
  assert.ok(res.body.items.length >= 10, 'at least 10 sample items expected');
  assert.equal(res.body.pagination.page, 1);
  assert.ok(res.body.pagination.total >= 12);

  const defaultPage = await request(app).get('/api/items');
  assert.equal(defaultPage.body.items.length, 9, 'default page size is 9');
  assert.ok(defaultPage.body.pagination.pages >= 2, 'seeded data spans more than one page');
});

test('TC10 GET /api/items?q= supports keyword search and filters (200)', async () => {
  const res = await request(app).get('/api/items').query({ q: 'wallet' });
  assert.equal(res.status, 200);
  assert.ok(res.body.items.length >= 1);
  res.body.items.forEach((item) => {
    const haystack = `${item.title} ${item.description} ${item.location}`.toLowerCase();
    assert.ok(haystack.includes('wallet'));
  });

  const filtered = await request(app).get('/api/items').query({ type: 'found', status: 'open' });
  assert.equal(filtered.status, 200);
  filtered.body.items.forEach((item) => {
    assert.equal(item.type, 'found');
    assert.equal(item.status, 'open');
  });
});

test('TC11 GET /api/items?type=invalid is rejected (400)', async () => {
  const res = await request(app).get('/api/items').query({ type: 'borrowed' });
  assert.equal(res.status, 400);
});

test('TC12 GET /api/items/:id returns one item, unknown id returns 404', async () => {
  const ok = await request(app).get(`/api/items/${ctx.createdItemId}`);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.item.id, ctx.createdItemId);

  const missing = await request(app).get('/api/items/64b7f9f2a1c3d4e5f6a7b8c9');
  assert.equal(missing.status, 404);
});

test('TC13 PUT /api/items/:id updates the status for the owner (200)', async () => {
  const res = await request(app)
    .put(`/api/items/${ctx.createdItemId}`)
    .set('Authorization', `Bearer ${ctx.studentToken}`)
    .send({ status: 'returned' });
  assert.equal(res.status, 200);
  assert.equal(res.body.item.status, 'returned');
  assert.ok(res.body.item.resolvedAt, 'resolvedAt should be stamped');
});

test('TC14 PUT /api/items/:id by a non-owner is forbidden (403)', async () => {
  const res = await request(app)
    .put(`/api/items/${ctx.createdItemId}`)
    .set('Authorization', `Bearer ${ctx.otherToken}`)
    .send({ title: 'Hijacked title' });
  assert.equal(res.status, 403);
});

test('TC15 DELETE /api/items/:id by a non-owner is forbidden, owner deletes (200 -> 404)', async () => {
  const forbidden = await request(app)
    .delete(`/api/items/${ctx.createdItemId}`)
    .set('Authorization', `Bearer ${ctx.otherToken}`);
  assert.equal(forbidden.status, 403);

  const deleted = await request(app)
    .delete(`/api/items/${ctx.createdItemId}`)
    .set('Authorization', `Bearer ${ctx.studentToken}`);
  assert.equal(deleted.status, 200);

  const gone = await request(app).get(`/api/items/${ctx.createdItemId}`);
  assert.equal(gone.status, 404);
});

test('TC16 POST /api/claims submits a claim and blocks duplicates (201 then 409)', async () => {
  // Pick a deterministic target: the found textbook reported by another student.
  const itemsRes = await request(app).get('/api/items').query({ q: 'Cormen', type: 'found' });
  const target = itemsRes.body.items[0];
  assert.ok(target, 'the found textbook must exist');
  assert.equal(target.status, 'open');

  const first = await request(app)
    .post('/api/claims')
    .set('Authorization', `Bearer ${ctx.studentToken}`)
    .send({ itemId: target.id, message: 'I believe this is mine - happy to describe it in detail.' });
  assert.equal(first.status, 201);
  assert.equal(first.body.claim.status, 'pending');
  ctx.claimId = first.body.claim.id;
  ctx.claimItemId = target.id;

  const duplicate = await request(app)
    .post('/api/claims')
    .set('Authorization', `Bearer ${ctx.studentToken}`)
    .send({ itemId: target.id, message: 'Second attempt on the same item.' });
  assert.equal(duplicate.status, 409);
});

test('TC17 POST /api/claims rejects claiming a lost item (400)', async () => {
  const lost = await request(app).get('/api/items').query({ type: 'lost', limit: 1 });
  const res = await request(app)
    .post('/api/claims')
    .set('Authorization', `Bearer ${ctx.studentToken}`)
    .send({ itemId: lost.body.items[0].id, message: 'Trying to claim a lost item.' });
  assert.equal(res.status, 400);
});

test('TC18 PATCH /api/claims/:id approve flow (403 for non-owner, 200 for admin)', async () => {
  const forbidden = await request(app)
    .patch(`/api/claims/${ctx.claimId}`)
    .set('Authorization', `Bearer ${ctx.studentToken}`)
    .send({ status: 'approved' });
  assert.equal(forbidden.status, 403);

  const approved = await request(app)
    .patch(`/api/claims/${ctx.claimId}`)
    .set('Authorization', `Bearer ${ctx.adminToken}`)
    .send({ status: 'approved' });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.claim.status, 'approved');

  const item = await request(app).get(`/api/items/${ctx.claimItemId}`);
  assert.equal(item.body.item.status, 'claimed');
});

test('TC19 GET /api/users/me/items and /api/users/me/claims feed the dashboard (200)', async () => {
  const mine = await request(app)
    .get('/api/users/me/items')
    .set('Authorization', `Bearer ${ctx.studentToken}`);
  assert.equal(mine.status, 200);
  assert.ok(mine.body.items.length >= 1);

  const claimsRes = await request(app)
    .get('/api/users/me/claims')
    .set('Authorization', `Bearer ${ctx.studentToken}`);
  assert.equal(claimsRes.status, 200);
  assert.ok(Array.isArray(claimsRes.body.made));
  assert.ok(Array.isArray(claimsRes.body.received));
});

test('TC20 GET /api/admin/stats is admin-only (401 without token, 403 for user, 200 for admin)', async () => {
  const anonymous = await request(app).get('/api/admin/stats');
  assert.equal(anonymous.status, 401);

  const asStudent = await request(app)
    .get('/api/admin/stats')
    .set('Authorization', `Bearer ${ctx.studentToken}`);
  assert.equal(asStudent.status, 403);

  const asAdmin = await request(app)
    .get('/api/admin/stats')
    .set('Authorization', `Bearer ${ctx.adminToken}`);
  assert.equal(asAdmin.status, 200);
  assert.ok(asAdmin.body.stats.totals.items >= 10);
  assert.ok(asAdmin.body.stats.byCategory);
});

test('TC21 Duplicate-item alert is returned when a matching opposite report exists (201 + warning)', async () => {
  await request(app)
    .post('/api/items')
    .set('Authorization', `Bearer ${ctx.studentToken}`)
    .send({
      title: 'Dark Blue Nike Water Bottle',
      description: 'Lost my dark blue Nike 750 ml bottle near the sports complex seating area.',
      category: 'Sports Equipment',
      location: 'Sports Complex',
      date: '2026-11-05',
      type: 'lost',
    });

  const res = await request(app)
    .post('/api/items')
    .set('Authorization', `Bearer ${ctx.studentToken}`)
    .send({
      title: 'Found: Blue Nike Water Bottle',
      description: 'Found a dark blue Nike water bottle near the sports complex seating area.',
      category: 'Sports Equipment',
      location: 'Sports Complex',
      date: '2026-11-05',
      type: 'found',
    });
  assert.equal(res.status, 201);
  assert.ok(Array.isArray(res.body.duplicateWarning));
  assert.ok(res.body.duplicateWarning.length >= 1, 'a similar lost bottle should be flagged');
});
