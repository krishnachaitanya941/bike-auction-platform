# RevBid architecture and design

## System components

- **React web client** (`web/`): React 19/TypeScript SPA, routed with
  `react-router-dom`, built by Vite. It presents auction lists, detail/bid
  workflows, authentication, and admin pages.
- **Express API** (`server/src/app.js`): Express 5 application exposing REST
  endpoints. `server/src/server.js` owns the HTTP listener, Socket.IO server,
  lifecycle scheduler, and shutdown handling.
- **MySQL**: relational source of truth for users, bikes, auctions, and bids.
- **Socket.IO**: process-local realtime channel for lobby and per-auction
  updates.
- **Deployment**: Vercel serves the SPA; Render runs the API; MySQL is hosted
  separately. The deployed frontend origin is explicitly allowlisted by the
  API.

## Database model

The schema is defined in `server/src/migrate.js`:

- `users`: unique email, bcrypt password hash, name, and `user`/`admin` role.
- `bikes`: make/model/year, mileage, condition notes, and optional image URL.
- `auctions`: bike foreign key, starting/current price, minimum increment,
  optional highest bidder, status, UTC start/end `DATETIME`, and version.
- `bids`: auction/user foreign keys, amount, request UUID, optional serialized
  result snapshot, timestamp, and a unique `(user_id, request_id)` key for
  idempotent retries.

Auction status values are `scheduled`, `live`, `ended`, and `cancelled`. The API
maps the user-facing `upcoming` filter to stored status `scheduled`. The MySQL
pool uses `timezone: 'Z'`; lifecycle comparisons and API server time use MySQL
`UTC_TIMESTAMP()`.

## API surface

| Method/path | Access | Purpose |
| --- | --- | --- |
| `POST /api/auth/register` | Public, rate-limited | Register a user and return JWT |
| `POST /api/auth/login` | Public, rate-limited | Verify credentials and return JWT |
| `GET /api/auth/me` | Bearer token | Current account |
| `GET /api/auctions?status=...&sort=...` | Public | List and count auctions |
| `GET /api/auctions/:id` | Public | Auction details and masked recent bidders |
| `POST /api/auctions/:id/bids` | Signed-in user | Place/retry a bid |
| `GET/POST /api/bikes` | Admin | List/create bike inventory |
| `POST /api/auctions` | Admin | Schedule an auction |
| `PATCH /api/auctions/:id/cancel` | Admin | Cancel scheduled/live auction |
| `GET /api/admin/stats`, `/api/admin/auctions` | Admin | Dashboard data |
| `GET /health`, `GET /metrics` | Public or optional metrics token | Health and Prometheus metrics |

Request schemas are validated with Zod. SQL values are parameterized; auction
sort clauses are selected from a fixed whitelist. API errors use a consistent
JSON envelope and do not return stack traces.

## Auction lifecycle

The scheduler starts from `server.js` and ticks every two seconds. It promotes a
scheduled auction to live when `starts_at <= UTC_TIMESTAMP()` and
`ends_at > UTC_TIMESTAMP()`. Auctions with elapsed end times transition from
scheduled/live to ended. Cancellation uses a guarded update, preventing a
cancelled auction from being transitioned by the scheduler.

The scheduler is process-local, not a distributed job system. A single Render
API instance is assumed for predictable realtime announcements. Multiple
instances can independently run ticks and emit duplicate transition events;
status predicates keep stored transitions idempotent, but do not coordinate
notifications across instances. `setInterval` also does not serialize slow
ticks, so unusually slow database calls may overlap within one process.

## Bid processing and realtime

`server/src/services/bidService.js` opens a MySQL transaction, locks the
auction row with `SELECT ... FOR UPDATE`, checks its status and UTC time window,
rejects self-overbids, and computes money thresholds in integer cents. The
first bid may equal the starting price; later bids must meet current price plus
the minimum increment. Accepted bids update price/high bidder/status and may
extend the end by 30 seconds when within the anti-sniping window. A unique
user/request UUID prevents duplicate writes; the original response snapshot is
returned for retries. Rollback is attempted on failure and the connection is
released in `finally`.

After commit, the API emits `bid:placed` to an auction room and
`auction:updated` to the lobby. Status transitions emit `auction:status`.
Realtime publishing is best effort; REST/database state remains authoritative.
The current Socket.IO instance and rooms are process-local and have no shared
adapter, so horizontal scaling requires a cross-instance adapter and
coordinated scheduler before relying on cross-instance push delivery.

## Authentication and security

- Passwords are hashed with bcrypt; registration/login responses expose only
  public user fields.
- JWT bearer tokens carry the subject and role and expire according to
  `JWT_EXPIRES_IN`.
- Admin routes require both authentication and `admin` role.
- Zod validates request bodies/query parameters; rate limits protect
  authentication and bidding; Helmet sets security headers.
- CORS allows the exact production Vercel origin and the two local development
  origins. Credentials are enabled; arbitrary origins are not.
- Database connection errors are logged with error codes and mapped to
  sanitized `503` responses. Other unexpected errors are logged server-side
  and return a generic response.
- `server/.env`, `.env.test`, `web/.env*`, and `server/ca.pem` are ignored and
  must remain untracked. The administrator seed password is supplied through
  `ADMIN_SEED_PASSWORD`; the regular demo bidder credentials are intentionally
  documented in the root README.

## Observability

Pino HTTP logs include request IDs and route-level request metadata. Health
checks query MySQL and return a degraded response if the database is
unavailable. Prometheus metrics track HTTP latency/status, bid outcomes,
WebSocket connections, scheduler ticks, and auction transitions. `METRICS_TOKEN`
can protect `/metrics`; when unset, the endpoint is public and should be
restricted at the deployment/network layer if that is not appropriate.

## Scalability, assumptions, and trade-offs

- **Assumptions:** one API process; MySQL is the durable source of truth; UTC
  timestamps are written consistently; the public Vercel origin remains the
  configured domain.
- **Scaling limits:** in-memory Socket.IO rooms and the two-second scheduler
  are not coordinated across API instances. Add a Socket.IO adapter and a
  distributed scheduler/lock before horizontal API scaling.
- **Database trade-off:** MySQL transactions and row locks keep bid acceptance
  simple and strongly serialized per auction without adding a cache or queue.
- **Realtime trade-off:** events improve responsiveness, while clients can
  refetch REST state and the auctions page polls as a fallback.
- **Security trade-off:** the demo bidder account is deliberately usable for
  evaluation and is not an admin. The seed script requires a separately
  supplied admin password and should only run against an intentionally chosen
  database.
- **Operational boundary:** integration tests truncate only
  `bike_auction_test` and enforce a local DB-host/database-name guard. They
  must never use a hosted/production database.
