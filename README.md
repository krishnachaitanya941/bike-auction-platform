# RevBid — Motorcycle Auction Platform

RevBid is a full-stack motorcycle auction application. Users can browse live,
upcoming, and ended auctions, view bid history, and place real-time bids.
Administrators can manage bikes and auctions.

## Live application

- Frontend: <https://bike-auction-platform-phi.vercel.app>
- API health: <https://bike-auction-platform-0zhd.onrender.com/health>

### Demo sign-in

The seeded demo bidder account is:

- Email: `demo@revbid.com`
- Password: `Demo@12345`

This is a regular user account, not an administrator. It is available only if
the demo user was seeded in the database. Do not use this password for any
other account.

## Technology

- Frontend: React 19, TypeScript, Vite, Tailwind CSS v4, React Router
- Backend: Node.js (CommonJS), Express 5, Zod, JWT, bcrypt
- Persistence: MySQL through `mysql2`
- Realtime: Socket.IO
- Security/operations: Helmet, CORS allowlist, rate limiting, Pino logging,
  Prometheus metrics

## Local development

Requirements: Node.js 20 or newer, npm, and a local MySQL server.

### Backend

1. Create a local development database and a least-privilege MySQL user.
2. In `server/`, install dependencies:

   ```powershell
   npm install
   ```

3. Create `server/.env` with the required settings below. For local MySQL, set
   `DB_SSL=false`; use a strong local-only `JWT_SECRET`.
4. Create the schema and optionally seed the demo/admin users:

   ```powershell
   npm run migrate
   $env:ADMIN_SEED_PASSWORD = '<unique local admin password>'
   npm run seed
   Remove-Item Env:ADMIN_SEED_PASSWORD
   ```

   The user seed upserts the demo user and the administrator, including their
   passwords. Never run it against production unless you intentionally want to
   reset those account passwords. `ADMIN_SEED_PASSWORD` is required and is not
   stored in the repository.
5. Start the API:

   ```powershell
   npm run dev
   ```

   The API defaults to `http://localhost:4000`.

### Frontend

In a second terminal:

```powershell
Set-Location web
npm install
npm run dev
```

Vite uses port `8443` by default. During local development, the frontend
defaults to the API at `http://localhost:4000`. Set `VITE_API_URL` only when
you need to override that URL.

### Required backend environment variables

| Variable | Purpose |
| --- | --- |
| `JWT_SECRET` | Strong signing secret for bearer tokens |
| `DB_HOST` | MySQL host |
| `DB_USER` | MySQL application user |
| `DB_PASSWORD` | MySQL application password |
| `DB_NAME` | Application database |

Optional/configuration variables:

| Variable | Default / purpose |
| --- | --- |
| `NODE_ENV` | Defaults to `development`; use `production` on Render and `test` only for tests |
| `PORT` | API port; defaults to `4000` |
| `DB_PORT` | MySQL port; defaults to the MySQL driver default (`3306`) |
| `JWT_EXPIRES_IN` | Token lifetime; defaults to `1h` |
| `DB_SSL` | TLS is enabled unless set to `false` |
| `DB_CA_CERT` | CA certificate text when TLS is enabled and `server/ca.pem` is unavailable |
| `BID_RATE_LIMIT` | Per-user bid request limit per minute; defaults to `30` |
| `METRICS_TOKEN` | Optional bearer token protecting `/metrics` |
| `ADMIN_SEED_PASSWORD` | Required only by `npm run seed`; administrator password |
| `VITE_API_URL` | Frontend build-time API origin override; production defaults to the Render API |

Production CORS permits the deployed Vercel origin
`https://bike-auction-platform-phi.vercel.app`. Development also permits
`http://localhost:8443` and `http://127.0.0.1:8443`.

## Tests and checks

Backend database-free tests:

```powershell
Set-Location server
npm run test:unit
```

The full backend integration suite uses `server/.env.test` and **truncates**
tables in the dedicated local `bike_auction_test` database between tests. Create
that database separately, copy `.env.test.example` to `.env.test`, and fill it
with local test-only credentials. The test setup refuses non-local hosts and
any database name other than `bike_auction_test`.

```powershell
Set-Location server
npm test
```

Frontend tests, type-check, and production build:

```powershell
Set-Location web
npm test
npx tsc --noEmit
npm run build
```

An API smoke-test procedure is in [server/tests/smoke.md](server/tests/smoke.md).
It requires a separate local test database; do not point it at production.

## Deployment

### Render API

Configure the Render Node service with `server/` as its root directory,
`npm install` as its build command, and `npm start` as its start command. Set
`NODE_ENV=production`, a strong `JWT_SECRET`, and the MySQL variables above.
For hosted MySQL, TLS is enabled by default; provide the CA using `DB_CA_CERT`
when `server/ca.pem` is unavailable (it is ignored and must not be committed).
Configure Aiven/network access to permit the Render service.
Do not run migrations, seeds, or smoke-test setup against production without
explicitly reviewing their effects.

### Vercel frontend

Configure the Vercel project root as `web/`, build command `npm run build`, and
output directory `dist`. Set `VITE_API_URL` to
`https://bike-auction-platform-0zhd.onrender.com` for production builds. The
SPA route rewrite is configured in [web/vercel.json](web/vercel.json).

The API CORS allowlist must match the exact deployed frontend origin. Changes to
the app require deploying the backend and frontend independently; this
repository does not deploy automatically.

For component boundaries, database design, lifecycle, bid processing, and
security trade-offs, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
