# Campus Lost and Found Portal

A full-stack web application that lets students and staff report lost items, publish what they
found, search every campus listing, submit claims, and track recoveries — with role-based
dashboards for users and administrators.

**Stack:** HTML5 / CSS3 / ES6+ (vanilla modules) · Node.js + Express.js · MongoDB with Mongoose ·
JWT authentication · bcrypt password hashing.

---

## 1. Features

### Core (as required by the project brief)

| Requirement | Where it is implemented |
|---|---|
| Responsive home page with recent reports, keyword search and filters | `public/index.html`, `public/js/home.js` |
| User authentication: signup, login, logout, role-based access | `src/controllers/authController.js`, `src/middleware/auth.js` |
| Lost / found report form (name, category, description, location, date, image) | `public/report.html`, `src/controllers/itemController.js` |
| Search by keyword, filter by category / location / status | `GET /api/items?q=&category=&location=&type=&status=` |
| Claim management (submit, approve, reject) | `src/controllers/claimController.js` |
| User dashboard (own reports + claims made/received) | `public/dashboard.html` |
| Admin dashboard (all listings, all claims, statistics) | `public/admin.html`, `GET /api/admin/stats` |
| REST APIs with CRUD for items and claims | `src/routes/*.js` |
| Input validation, secure password handling, error handling | `src/utils/validation.js`, `src/middleware/error.js` |
| Sample data (≥10 items) | `src/utils/seedData.js` — 12 listings, 4 accounts, 3 claims |
| API test evidence (≥8 cases) | `tests/api.test.js` (21 automated cases), `postman/` (Postman collection) |

### Additional features (extra credit)

1. **Date sorting** — `?sort=newest|oldest|date_desc|date_asc|title` on `GET /api/items`.
2. **Duplicate-item alert** — when a report is created, recent open listings of the *opposite* type in
   the same category and location (±7 days) are returned as `duplicateWarning` and shown to the user.
3. **Admin dashboard charts** — listings by category and top reported locations rendered as bar
   charts, plus recovery-rate and claim counters (no external chart library, works offline).

---

## 2. Project structure

```
campus-lost-and-found/
├── server.js                  # entry point: connect DB, optional seed, listen
├── src/
│   ├── app.js                 # Express app: middleware, static files, route mounting
│   ├── config/index.js        # env config, categories, campus locations, enums
│   ├── models/                # Mongoose schemas: User, Item, Claim
│   ├── store/                 # data layer: mongo.js (Mongoose) | memory.js (tests only)
│   ├── middleware/            # auth (JWT), error handler, multer upload, rate limit
│   ├── controllers/           # auth, item, claim, admin business logic
│   ├── routes/                # /auth /items /claims /users /admin routers
│   └── utils/                 # validation, serializers, seed data, ApiError
├── public/                    # frontend: HTML pages, CSS, ES6 modules, uploaded images
├── tests/api.test.js          # 21-case automated API suite (node:test + supertest)
├── postman/                   # Postman collection + environment (35 requests, 71 assertions)
├── scripts/run-collection.js  # replays the collection and runs its assertions
├── .github/workflows/ci.yml   # CI: test suite + collection replay + server smoke test
├── docs/                      # project report (DOCX/PDF), screenshots, diagrams
└── LICENSE                    # MIT
```

---

## 3. Getting started

### Prerequisites
* Node.js 18 or newer
* MongoDB 6+ running locally **or** a MongoDB Atlas connection string

### Install and run

```bash
git clone <your-repo-url> campus-lost-and-found
cd campus-lost-and-found
npm install
cp .env.example .env          # then edit MONGO_URI and JWT_SECRET
npm run seed                  # optional: insert 12 sample items, 4 accounts, 3 claims
npm run dev                   # nodemon, http://localhost:5000
# or
npm start
```

Open <http://localhost:5000>. The API is served under `/api`.

### Demo accounts (created by the seed script)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@campus.edu` | `Admin@123` |
| Student | `belumvishalreddy7@gmail.com` | `Student@123` |
| Student | `priya.sharma@campus.edu` | `Student@123` |
| Student | `arjun.rao@campus.edu` | `Student@123` |

### Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | HTTP port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/campus_lost_found` |
| `JWT_SECRET` | Signing key for access tokens (**required in production**) | dev placeholder |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `CLIENT_ORIGIN` | Allowed CORS origins (comma separated) | `http://localhost:5000` |
| `DB_DRIVER` | `mongo` (default) or `memory` (offline demo/tests) | `mongo` |
| `SEED_ON_START` | Seed sample data when the database is empty | `true` |

> `DB_DRIVER=memory` exists only so the app and the test suite can run on a machine without
> MongoDB. Production always uses MongoDB through Mongoose.

---

## 4. API reference

Base URL: `http://localhost:5000/api`. Protected routes need `Authorization: Bearer <token>`.

### Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/signup` | Public | Register; hashes password with bcrypt, returns JWT (201) |
| POST | `/auth/login` | Public | Verify credentials, return JWT (200 / 401) |
| GET | `/auth/me` | User | Current profile |
| POST | `/auth/logout` | User | Acknowledge logout (JWT is stateless) |

### Items

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/items` | Public | List / search / filter / sort / paginate |
| GET | `/items/:id` | Public | Single listing + pending claim count |
| GET | `/items/:id/claims` | Owner, admin | Claims submitted on a listing |
| POST | `/items` | User | Create a report (JSON or `multipart/form-data` with `image`) |
| PUT / PATCH | `/items/:id` | Owner, admin | Update fields or status |
| DELETE | `/items/:id` | Owner, admin | Delete listing and its claims |

Query parameters for `GET /items`: `q`, `category`, `location`, `type` (`lost|found`),
`status` (`open|claimed|returned`), `sort` (`newest|oldest|date_desc|date_asc|title`),
`page`, `limit` (max 50, default 9).

### Claims

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/claims` | User | Claim a **found** item (one pending claim per user per item) |
| GET | `/claims/mine` | User | `{ made, received }` |
| GET | `/claims/:id` | Claimant, item owner, admin | Claim details |
| PATCH | `/claims/:id` | Item owner, admin | `{ "status": "approved" \| "rejected" }` |

Approving a claim sets the item to `claimed` and auto-rejects the competing pending claims.

### Dashboards

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/users/me/items` | User | My listings |
| GET | `/users/me/claims` | User | Claims made + claims received |
| GET | `/admin/stats` | Admin | Totals, status/type/category breakdown, top locations, recovery rate |
| GET | `/admin/items` | Admin | All listings with the public filters |
| GET | `/admin/claims` | Admin | All claims (`?status=`) |
| GET | `/admin/items/:id/claims` | Admin | Claims for one listing |
| GET | `/admin/users` | Admin | Registered accounts |

### Utility

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Service status and active driver |
| GET | `/api/meta` | Categories, campus locations, statuses (used to build the forms) |

### Response shapes

Success: `{ "success": true, ...payload }`
Error: `{ "success": false, "message": "...", "errors": { "field": "reason" } }`

Status codes used: `200`, `201`, `400` validation, `401` unauthenticated, `403` forbidden,
`404` not found, `409` conflict/duplicate, `429` rate limited, `500` server error.

---

## 5. Testing

### Automated suite (no MongoDB needed)

```bash
npm run test:offline        # 21 cases against the in-memory driver
```

```
# tests 21
# pass 21
# fail 0
```

With a real database:

```bash
MONGO_URI=mongodb://127.0.0.1:27017/campus_lost_found_test DB_DRIVER=mongo npm test
```

### Postman

1. Import `postman/Campus_Lost_and_Found.postman_collection.json` and
   `postman/Local.postman_environment.json`.
2. Select the **Campus Lost and Found — Local** environment.
3. Run the whole collection with **Run → Run collection**. Tokens and IDs are captured
   automatically by test scripts, so requests can run in order.

The collection documents 35 requests with 71 assertions covering success paths, validation errors,
unauthorized access, ownership rules and the claim approval workflow.

### Scripted replay (no Postman GUI)

```bash
npm run test:collection                                        # boots a temporary in-memory server
BASE_URL=https://your-app.onrender.com npm run test:collection  # replays against a live deployment
```

```
Assertions: 71 passed, 0 failed
```

### Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request: one job installs with `npm ci` and
runs the 21-case suite plus the collection replay, a second job boots the server and probes
`/api/health`, `/api/items` and the home page. Neither job needs a database service.

---

## 6. Security notes

* Passwords are hashed with bcrypt (10 salt rounds) and never returned by any endpoint.
* JWT access tokens are verified on every protected route; `req.user` is loaded from the database.
* Authorisation rules live in one place: `isOwnerOrAdmin()` plus the `requireAdmin` middleware.
* All input is validated server-side (lengths, enums, date sanity, URL format) before it reaches
  Mongoose, and Mongoose re-validates through schema constraints.
* `helmet` sets security headers, CORS is restricted in production, JSON bodies are capped at 1 MB,
  uploads are limited to images ≤ 2 MB, and `/api/auth/*` is rate limited.
* Secrets live in `.env` (git-ignored); the app refuses to start in production with the default JWT secret.

---

## 7. Deployment

**Render / Railway / Heroku (single service):**

1. Push the repository to GitHub.
2. Create a MongoDB Atlas cluster and copy the connection string.
3. Create a web service from the repo (build: `npm install`, start: `npm start`) — `Procfile`
   is included for Heroku-style hosts.
4. Set environment variables: `MONGO_URI`, `JWT_SECRET`, `NODE_ENV=production`,
   `CLIENT_ORIGIN=https://<your-app-url>`.
5. Deploy, then verify `GET /api/health` and run the Postman collection against the live URL.

---

## 8. Author

Belum Vishal Reddy — Campus Lost and Found Portal, Sai University.
#   c a m p u s - l o s t - a n d - f o u n d  
 #   c a m p u s - l o s t - a n d - f o u n d  
 #   c a m p u s - l o s t - a n d - f o u n d  
 