# Rate Limiter as a Service

RateShield is a rate-limiting API. Client applications send a request to `POST /api/check` and receive an allow/deny decision. Limits can be applied by plan, IP address, and user ID.

The API supports Token Bucket, Sliding Window, and Fixed Window algorithms. Token Bucket and Sliding Window use Redis Lua scripts; Fixed Window uses a Redis counter. A circuit breaker switches to an in-memory fallback when Redis is unavailable.

See [DESIGN.md](./DESIGN.md) for architecture decisions and trade-offs.

## Stack

- **API:** Node.js, Express, Redis (`ioredis`), PostgreSQL (`pg`)
- **Dashboard:** React, Vite, Tailwind CSS, React Router, Axios
- **Shared packages:** SDK and shared constants under `apps/package/`
- **Infrastructure:** Docker Compose for Redis and PostgreSQL; optional containerized API

## Requirements

- Node.js 22.13 or newer
- npm
- Docker with the Compose plugin

## Local setup

Install dependencies from the repository root:

```bash
npm ci
```

Copy `apps/api/.env.example` to `apps/api/.env`. Replace its placeholders with an admin password hash and a long, unique JWT secret:

```dotenv
ADMIN_PASSWORD_HASH=replace-with-bcrypt-hash
JWT_SECRET=replace-with-long-random-secret
```

Generate a bcrypt hash locally with the API's installed `bcrypt` dependency, replacing the example password:

```bash
node --input-type=module -e "import bcrypt from 'bcrypt'; console.log(await bcrypt.hash('replace-this-password', 12))"
```

Put the output in `ADMIN_PASSWORD_HASH`. Do not put the plain-text admin password in this file or commit `.env`. The API uses `localhost` and the default Compose database credentials unless you set different PostgreSQL or Redis environment variables.

Start Redis and PostgreSQL:

```bash
docker compose up -d redis postgres
```

Create the database table:

```bash
npm run migrate --workspace=apps/api
```

Start the API:

```bash
npm run dev:api
```

The API listens on `http://localhost:3000`. In another terminal, start the dashboard from the repository root:

```bash
npm run dev:dashboard
```

Open `http://localhost:5173` and sign in with the password whose bcrypt hash you configured. Create and manage client API keys from the dashboard.

### Run the full stack in Docker

The Compose API service expects `apps/api/.env` to exist. After creating it as described above, start the services and build the API image with:

```bash
docker compose up -d --build
```

For custom PostgreSQL credentials in Docker, set matching values in the repository-root `.env` (used by Compose) and `apps/api/.env` (used by the API).

Run the database migration inside the API container:

```bash
docker compose exec api npm run migrate
```

## API

### Check a rate limit

`POST /api/check` requires the registered client's API key in `x-api-key`. A user ID is optional:

```bash
curl -X POST http://localhost:3000/api/check \
  -H "x-api-key: your-registered-client-key" \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-123"}'
```

Allowed requests return `200`; rate-limited requests return `429`. The JSON response includes `allowed`, `remaining`, and `resetAt` (milliseconds since the Unix epoch). Denials also include `deniedBy` and a `Retry-After` header.

### Health

`GET /health` reports API and Redis status. It does not check PostgreSQL.

### Admin and client management

Sign in at `/login` in the dashboard. Admin routes use the `admin_session` cookie created by `POST /api/admin/login`; they do not use the client API key header.

| Method | Path | Access |
| --- | --- | --- |
| `POST` | `/api/admin/login` | Public; accepts `{ "password": "..." }` |
| `POST` | `/api/admin/logout` | Admin session |
| `GET` | `/api/admin/check` | Admin session |
| `GET` | `/api/clients` | Admin session |
| `GET` | `/api/clients/:apiKey` | Admin session |
| `POST` | `/api/clients` | Admin session |
| `PUT` | `/api/clients/:apiKey` | Admin session |
| `DELETE` | `/api/clients/:apiKey` | Admin session |
| `GET` | `/api/check/audit` | Admin session |
| `GET` | `/api/check/stats` | Admin session |
| `DELETE` | `/api/check/cache` | Admin session |

Plans are `free` (100 requests/minute), `pro` (1,000 requests/minute), and `enterprise` (10,000 requests/minute) by default. Change these with the `DEFAULT_*` environment variables.

## SDK

The SDK workspace package provides `RateLimiterClient` and Express middleware. See [the SDK guide](./apps/package/sdk/README.md) for examples. The SDK middleware fails open if the rate-limiting service is unreachable.

## Tests and checks

Run the API tests:

```bash
npm run test --workspace=apps/api
```

Run dashboard lint and production build:

```bash
npm run lint --workspace=apps/dashboard
npm run build --workspace=apps/dashboard
```

## Load test

The root `test.js` is a k6 load-test script. Install k6 separately, create a client in the dashboard, then run:

```bash
k6 run -e API_KEY=your-registered-client-key test.js
```

The script defaults to `http://localhost:3000`; set `BASE_URL` to use a different API address. It reports throughput, latency, allow/deny counts, and denial reasons.

## Configuration

The API reads environment variables from `apps/api/.env` when started locally:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | API port |
| `NODE_ENV` | `development` | Runtime environment |
| `REDIS_HOST` / `REDIS_PORT` | `localhost` / `6379` | Redis connection |
| `REDIS_PASSWORD` | unset | Redis password |
| `POSTGRES_HOST` / `POSTGRES_PORT` | `localhost` / `5432` | PostgreSQL connection |
| `POSTGRES_USER` | `admin` | PostgreSQL user |
| `POSTGRES_PASSWORD` | `secret` | PostgreSQL password |
| `POSTGRES_DB` | `rate_limiter` | PostgreSQL database |
| `ADMIN_PASSWORD_HASH` | unset | bcrypt hash checked at admin login |
| `JWT_SECRET` | unset | Secret used to sign admin sessions |
| `CIRCUIT_BREAKER_THRESHOLD` | `5` | Redis failures before opening the circuit |
| `CIRCUIT_BREAKER_RECOVERY_MS` | `30000` | Delay before testing Redis recovery |
| `DEFAULT_FREE_LIMIT` | `100` | Free plan requests per window |
| `DEFAULT_PRO_LIMIT` | `1000` | Pro plan requests per window |
| `DEFAULT_ENTERPRISE_LIMIT` | `10000` | Enterprise plan requests per window |
| `DEFAULT_WINDOW_MS` | `60000` | Plan limit window in milliseconds |

## Known limitations

- API-key and limiter caches do not evict old entries, so their memory use can grow in long-running processes.
- The Redis-outage fallback is in-memory and per API process; multiple replicas keep separate fallback counts.
- The audit log is in memory and keeps at most 500 entries, so it is cleared when the API restarts.
- `InMemoryClientRepository` remains available, but the API uses PostgreSQL.
