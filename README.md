# Banking App — Distributed, Concurrency-Safe

A small retail-banking app built to demonstrate a real distributed setup:
multiple stateless API replicas behind a load balancer, a connection-pooled
Postgres, Redis-backed sessions and locks, and an async event pipeline
through RabbitMQ.

## Features

- **Accounts** — checking / savings, 12-digit account numbers, multiple per user.
- **Money movement** — deposit, withdraw, transfer between any two accounts.
- **Concurrency-safe** — Redis distributed locks + Postgres `SELECT … FOR UPDATE`
  with deterministic ordering, plus a `CHECK (balance >= 0)` constraint as a
  hard backstop. Two clients hammering the same account cannot overdraw or
  desync.
- **Idempotent** — every write accepts an `Idempotency-Key` header; replays
  return the original result.
- **Stateless API** — JWT sessions live in Redis, so any replica can serve any
  request and `/user/logout` revokes instantly across the fleet.
- **Async fan-out** — successful transactions publish to RabbitMQ; worker
  replicas consume them (notifications, statements, fraud, etc.).
- **Auditable ledger** — each transaction stores `kind`, signed `amount`, and
  `balance_after`; transfers are two paired rows joined by a shared `transfer_id`.

## Architecture

```
                                ┌─────────────────────────┐
                                │      nginx (5000)       │
                                │     load balancer       │
                                └─────────────┬───────────┘
                                              │ round-robin
                       ┌──────────────────────┼──────────────────────┐
                       ▼                      ▼                      ▼
                  ┌─────────┐           ┌─────────┐           ┌─────────┐
                  │backend 1│           │backend 2│           │backend 3│
                  │ (Flask) │           │ (Flask) │           │ (Flask) │
                  └────┬────┘           └────┬────┘           └────┬────┘
                       │                     │                     │
            ┌──────────┴──────────┬──────────┴──────────┐          │
            ▼                     ▼                     ▼          ▼
       ┌─────────┐           ┌─────────┐          ┌──────────┐
       │ Redis   │           │RabbitMQ │          │PgBouncer │
       │sessions │           │ events  │          │  pool    │
       │ + locks │           └────┬────┘          └────┬─────┘
       └─────────┘                │                    │
                                  ▼                    ▼
                            ┌──────────┐         ┌──────────┐
                            │ workers  │         │Postgres15│
                            │ (×2)     │         │ ledger   │
                            └──────────┘         └──────────┘
```

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (Compose v2)

## Quick start

```bash
docker compose build
docker compose up -d
```

This brings up:

| Service     | Port (host) | Purpose                                            |
| ----------- | ----------- | -------------------------------------------------- |
| `frontend`  | 3000        | React UI                                           |
| `nginx`     | 5000        | API edge — load-balances `backend` replicas        |
| `backend`   | (internal)  | Flask API (scale with `--scale backend=N`)         |
| `worker`    | (internal)  | RabbitMQ consumer (scale with `--scale worker=N`)  |
| `pgbouncer` | 6432        | Postgres connection pool (transaction mode)        |
| `postgres`  | 5434        | Primary DB (used directly by `migrate` job)        |
| `redis`     | 6379        | Sessions + per-account distributed locks           |
| `rabbitmq`  | 5672 / 15672| AMQP + management UI (`guest` / `guest`)           |

The `migrate` service runs `alembic upgrade head` once on startup and then
exits. The `backend` and `worker` services wait for it before booting.

## Using the app

Open <http://localhost:3000>. A seeded user is available:

```
EMAIL: dummy@dummy.com
PASS:  password
```

Or sign up — every new user gets a `Primary Checking` account automatically.

## Verifying the distributed setup

**Watch which replica serves each request** — every API response carries an
`X-Served-By` header set to the container hostname:

```bash
curl -I http://localhost:5000/health
# X-Served-By: <random-container-id>
```

Hit it a few times; the value rotates because nginx is load-balancing.

**Try concurrent transactions** — open two browser windows on the same
account and submit a withdrawal in each at the same time. The dashboard
auto-refreshes every few seconds, so you can watch the balance settle. The
distributed lock + row lock + `CHECK (balance >= 0)` make over-drawing
impossible.

**Watch async events** — tail the worker:

```bash
docker compose logs -f worker
```

Each successful deposit / withdrawal / transfer prints a line, load-balanced
across the 2 worker replicas by RabbitMQ.

## Concurrency model in detail

Every money-movement endpoint follows the same pattern:

1. Validate input + parse amount as `Decimal`.
2. **Look up** any prior `Transaction` with the same `(account_id, Idempotency-Key)`
   and short-circuit if found.
3. Acquire a **Redis distributed lock** on each affected `account_id`,
   sorted ascending. Sorting prevents deadlocks between transfers in opposite
   directions (A→B and B→A can never grab locks in conflicting order).
4. Open a Postgres transaction; `SELECT … FOR UPDATE` the affected rows in
   the same sorted order.
5. Compute new balances. For withdrawals/transfers, refuse if the source
   would go negative.
6. Insert one (deposit/withdraw) or two (transfer in + transfer out) ledger
   rows, plus a unique `transfer_id` for transfers.
7. `COMMIT`. The Postgres `CHECK (balance >= 0)` constraint is the final
   defense — even if every other layer is buggy, the DB refuses to overdraw.
8. Release Redis locks; publish event to RabbitMQ (best-effort).

If two clients race on the same account, one acquires the Redis lock first
and proceeds; the other blocks (up to 2s) and then runs against the freshly
committed state.

## API summary

All endpoints (except `/user/login`, `/user/signup`, `/health`) require a
`Bearer` JWT in `Authorization`. Money-movement endpoints accept an optional
`Idempotency-Key` header (a UUID v4 is fine).

| Method | Path                                       | Purpose                          |
| ------ | ------------------------------------------ | -------------------------------- |
| POST   | `/user/signup`                             | Create user + starter account    |
| POST   | `/user/login`                              | Issue JWT, store session in Redis|
| POST   | `/user/logout`                             | Revoke session                   |
| GET    | `/user/me`                                 | Current user                     |
| GET    | `/account`                                 | List user's accounts             |
| POST   | `/account`                                 | Open new account                 |
| GET    | `/account/<id>`                            | Account detail                   |
| DELETE | `/account/<id>`                            | Close account (must be $0)       |
| GET    | `/account/<id>/transaction?limit=&kind=`   | Recent ledger entries            |
| POST   | `/account/<id>/deposit`                    | Credit                           |
| POST   | `/account/<id>/withdraw`                   | Debit                            |
| POST   | `/account/<id>/transfer`                   | Move money to another account    |

## Database migrations

Migrations run automatically via the `migrate` service on `docker compose up`.
To run them by hand:

```bash
# upgrade to head against any backend replica
docker compose exec backend flask db upgrade

# downgrade by N revisions
docker compose exec backend flask db downgrade -x <N>
```

## Scaling

Adjust `deploy.replicas` in `docker-compose.yml`, or override at runtime:

```bash
docker compose up -d --scale backend=5 --scale worker=4
```

The API is fully stateless, so scaling is just "start more containers."
Sessions live in Redis, locks live in Redis, the queue lives in RabbitMQ,
and PgBouncer multiplexes the Postgres connections so adding replicas
doesn't blow up the DB connection budget.
