# Kalendo

![Next.js](https://img.shields.io/badge/Next.js-16.4-000000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6_strict-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17_+_RLS-4169E1?logo=postgresql&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-deposits-635BFF?logo=stripe&logoColor=white)

Multi-tenant booking and team scheduling for salons, clinics and studios. Each business gets a public booking page, a shared team calendar, optional Stripe deposits and confirmation and reminder emails. Double bookings and cross-tenant reads are ruled out by Postgres, not by application code.

## Product

### Customers

- Four steps: service, staff member (or "anyone available"), date and time, details.
- Date strip with open-slot counts per day; times grouped into morning, afternoon and evening.
- Times shown in the visitor's zone, one click to switch to the business's zone.
- Optional deposit through Stripe Checkout. The slot is held during payment and released if the customer doesn't pay.
- Lost a race for a slot? A clear message and fresh availability, and the form keeps what was typed.
- Confirmation page and email with a self-service cancel link.

### Businesses

- Overview: today's schedule, next two weeks, weekly bookings chart, revenue.
- Week calendar with lanes for overlapping bookings, staff filter, booking side panel.
- Bookings list (upcoming, past, cancelled), manual bookings, cancellation with customer notification.
- Customers with visit history and private notes.
- Services with duration, price, deposit and prep/cleanup buffers, assigned to staff.
- Team: email invitations, owner/admin/staff roles, weekly hours with breaks, time off.
- Settings: slot interval, minimum notice, booking horizon, holidays, Pro plan billing, append-only audit log.

### Demo

Start with `DEMO_MODE=1` and click **Try the demo** on the landing page. That signs you into Glow Studio, a fictional salon with about five weeks of bookings and three staff.

| | |
| --- | --- |
| Owner | `demo@kalendo.dev` / `kalendo-demo-2026` |
| Admin | `admin@kalendo.dev` / `kalendo-demo-2026` |
| Booking pages | `/b/glow-studio`, `/b/northside-physio` |

Demo mode uses the signed fake checkout and prints emails to the server log.

### Interface

- Warm cream canvas, espresso brand color, caramel accent. Montserrat for UI, a typewriter-style mono for titles.
- Dashboard collapses to a top bar with a menu on phones; the booking flow is mobile-first.
- Route-level loading and error states, empty states everywhere.
- Radix dialogs and menus, visible focus rings, live regions in the booking widget.
- A dark palette exists in the CSS but there is no theme switch yet.

## Engineering

### Stack

| | |
| --- | --- |
| App | Next.js 16.4 (App Router, Server Components, Server Actions), React 19.3 |
| Language | TypeScript 6 `strict`, zod 4 |
| UI | Tailwind CSS 4.3, Radix UI, lucide-react, sonner |
| Data | PostgreSQL 17 + RLS + `btree_gist`, Drizzle ORM 0.45, plain SQL migrations |
| Auth | Better Auth 1.7 (password, magic link) |
| Payments | Stripe 23 behind a provider interface, signed fake for local use |
| Email | Nodemailer 10, Mailpit in development |
| Time | Temporal via `temporal-polyfill` |
| Tests | Vitest 5, Playwright 1.64 |

### Double-booking guarantee

An exclusion constraint rejects any two active bookings for the same staff member whose time ranges overlap. The range covers prep and cleanup buffers and unpaid holds.

```sql
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    staff_id WITH =,
    tstzrange(blocked_from, blocked_until, '[)') WITH &&
  )
  WHERE (status IN ('pending_payment', 'confirmed'));
```

Overlapping inserts can deadlock under load, so bookings take per-staff advisory locks in sorted order and retry on `40P01`. An integration test fires 25 parallel requests at one slot and expects one winner.

### Tenant isolation

The app connects as a `NOSUPERUSER NOBYPASSRLS` role. `withTenant()` sets the organisation with a transaction-local `set_config`, so it can't leak across pooled connections, and a query without it sees nothing. Every mutation goes through `runOrgAction`: auth, zod, tenant, role check, then the handler.

### Payments

- Two-phase checkout: the hold commits before the Stripe call, so no lock is held across the network.
- Webhooks verify the signature on the raw body, then record the event id and apply side effects in one transaction. Redeliveries are no-ops.
- A payment that arrives after the hold expired revives the booking if the slot is free, otherwise it queues a refund.
- Without Stripe keys a fake provider signs its own events and uses the same pipeline.

### Emails and refunds

Written to an outbox in the same transaction as the booking. The worker claims rows with `FOR UPDATE SKIP LOCKED`, retries with backoff and dead-letters after repeated failures. Refunds carry a Stripe idempotency key.

### Time zones

Opening hours are wall-clock times in the business's IANA zone; bookings are `timestamptz`. Spring-forward gaps are skipped, fall-back hours are offered twice.

### Demo mode

`DEMO_MODE=1` adds one-click sign-in, forces the fake payment provider, logs emails instead of sending them, drains the outbox after each request and enables a nightly reset endpoint.

### Layout

```
drizzle/              SQL migrations: schema, RLS policies, roles, exclusion constraint
scripts/              migrate, reset, seed, deploy-db
src/
  app/app/[org]/      dashboard
  app/b/[org]/        public booking page, status, cancel, fake checkout
  app/api/            auth, public availability, webhooks, cron, demo
  lib/availability/   pure availability engine
  server/             db, auth, actions, services, payments, outbox, mail
  worker/             outbox processor
tests/
  integration/        Vitest on Postgres
  e2e/                Playwright
```

### Tests

- Unit (171): availability engine incl. DST, calendar layout, validation, RBAC, signatures, backoff.
- Integration: as the restricted role on a throwaway database. RLS, the constraint under concurrency, duplicate webhooks, outbox dead-lettering.
- E2E: sign up, create a business, book publicly, pay a deposit.

## Running locally

Node.js 22.12+ (24 recommended) and Docker.

```bash
git clone <your-fork-url> kalendo
cd kalendo
npm install
cp .env.example .env
docker compose up -d     # Postgres 17 on 5433, Mailpit on 1025 / 8025
npm run db:migrate       # migrations + restricted app role
npm run seed             # two demo businesses
npm run dev              # http://localhost:3000 + outbox worker
```

If 5433 is taken, change the mapping in `docker-compose.yml` and both URLs in `.env`.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Restricted app role; RLS always applies |
| `DATABASE_ADMIN_URL` | yes | Migrations, seed, reset, test setup only |
| `BETTER_AUTH_SECRET` | yes | 32+ characters |
| `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` | yes | Public base URL |
| `MAIL_TRANSPORT` | no | `smtp`, `log` or `memory` |
| `STRIPE_SECRET_KEY` | no | Empty = fake provider |
| `STRIPE_WEBHOOK_SECRET` | with Stripe | From `stripe listen` |
| `DEMO_MODE` | no | `1` enables the demo |
| `CRON_SECRET` | for cron | Bearer token for cron endpoints |

Real Stripe in test mode:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Put the `whsec_...` value in `STRIPE_WEBHOOK_SECRET` and pay with `4242 4242 4242 4242`. Handled events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `customer.subscription.deleted`.

### Deploying

Targets Vercel + a managed Postgres such as Neon. `vercel.json` sets the build command and crons.

- Two connection strings to the same database: `DATABASE_URL` (app role, pooled host) and `DATABASE_ADMIN_URL` (owner, direct host).
- `npm run vercel-build` runs migrations (and seeds an empty database in demo mode) before `next build`.
- Set `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET` and either Stripe or `DEMO_MODE=1`.
- Crons: `/api/demo/reset` daily at 06:00 UTC, `/api/cron/outbox` daily as a safety net. For timely reminders run the outbox more often, or run `npm run worker` as a long-lived process.

## Scripts

| Script | |
| --- | --- |
| `dev` | Next.js + outbox worker |
| `dev:web` | Next.js only |
| `build` / `start` | Production build and server |
| `worker` | Outbox worker on its own |
| `db:migrate` | Apply migrations, provision app role |
| `db:reset` | Drop and migrate again |
| `seed` | Seed demo businesses |
| `db:generate` | Migration from the Drizzle schema |
| `typecheck` / `lint` / `format` | TypeScript, ESLint, Prettier |
| `test` | Unit tests |
| `test:integration` | Integration tests on Postgres |
| `test:e2e` | Playwright |
| `ci` | Everything CI runs |

MIT licensed.