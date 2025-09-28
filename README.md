# Kalendo

**The seamless, blazing fast, all-in-one booking platform that salons, clinics and studios have been waiting for!**

Say goodbye to double bookings forever. **Kalendo** is a **powerful**, **next-generation** multi-tenant booking SaaS that gives **every single business** its own **beautiful public booking page**, a **shared team calendar**, **optional Stripe deposits** and **automatic confirmation and reminder emails**, all wrapped up in **one stunning dashboard** where owners can effortlessly manage bookings, customers, services, staff hours, holidays and billing without ever breaking a sweat. Whether you run a busy salon in New York or a physio practice in Chicago, Kalendo is built to **supercharge** your scheduling and **delight** your customers at every step of the journey.

But that's not all! Under the hood, Kalendo is powered by a **rock-solid, enterprise-grade** backend that takes reliability **seriously**. **Tenant isolation** is enforced by **Postgres Row Level Security**, so one business can never see another business's data, ever. **Overlapping appointments** are rejected by a **database exclusion constraint**, which means double bookings are **literally impossible**. **Webhooks are idempotent**, and every **email or refund** goes through a **transactional outbox**, so nothing ever gets lost. And every one of those guarantees is backed by an **integration test that runs against real Postgres**. Pretty amazing, right?

## **Why Kalendo?**

Because your customers deserve a **frictionless, delightful** booking experience, and your team deserves a calendar that **just works**. Kalendo combines a **cutting-edge** tech stack with **thoughtful** product design to deliver an experience that is **second to none**.

## **Features**

- **Four-step booking flow** (service, staff member or "anyone available", date and time, details), built with **Next.js 16.4 Server Components**
- **Date strip** with the number of open slots per day, computed by a **pure availability engine** using **Temporal**
- Times grouped into **morning, afternoon and evening**
- Times shown in the **visitor's own time zone**, with a one-click switch to the business's zone (opening hours stored as wall-clock times in the business's **IANA zone**, bookings as `timestamptz`)
- **Deposits through Stripe Checkout**, powered by **Stripe 23** behind a **provider interface**
- The slot is **held** while the customer pays and **released automatically** if they don't
- **Two-phase checkout**: the hold commits before the Stripe call, so no row lock is held across the network
- If two people grab the same slot, the loser gets a **clear message** and **fresh availability** without losing what they typed
- **Confirmation page and email** with a **self-service cancel link**, sent with **Nodemailer 10** through the **outbox**
- **Overview** with today's schedule, the next two weeks, a weekly bookings chart and revenue
- **Week calendar** with lanes for overlapping bookings, a staff filter and a side panel
- **Bookings list** (upcoming, past, cancelled), manual bookings and cancellation with customer notification
- **Customer list** with visit history and private notes
- **Services** with duration, price, deposit and prep/cleanup buffers, stored with **Drizzle ORM 0.45**
- **Team management** with invitations by email and **owner/admin/staff roles** enforced on the server through `runOrgAction`
- **Authentication** by **Better Auth 1.7** (email + password, magic link)
- Weekly hours with breaks and time off
- **Settings**: slot interval, minimum notice, booking horizon, holidays, **Pro plan billing** and an **append-only audit log**
- **Accessible** Radix UI primitives and **Tailwind CSS 4.3**
- **TypeScript 6 strict** and **zod 4** validation at every boundary
- **171 unit tests**, **integration tests** on real Postgres and **Playwright 1.64** E2E

## **Bulletproof Double-Booking Protection**

We **guarantee** that two customers can **never** book the same staff member at the same time. An **exclusion constraint** on `tstzrange(blocked_from, blocked_until)` per staff member **rejects overlaps at the database level**, including **prep and cleanup buffers** and **unpaid holds**. Overlapping inserts under heavy load can deadlock each other, so bookings also take **per-staff advisory locks in sorted order** and **retry on `40P01`**. We even have a test that fires **25 parallel requests** at one slot and expects **exactly one winner**. Now that's **peace of mind**!

## **Gorgeous Design, Everywhere**

Kalendo looks **absolutely stunning** on every device! A **warm cream canvas**, **espresso** brand color and **caramel** accent create a **premium, editorial** feel, with **Montserrat** for the interface and a **typewriter-style monospace** for titles. The dashboard collapses **beautifully** to a top bar on mobile, and the public booking flow is **mobile-first**. **Radix primitives**, **visible focus rings** and **live regions** make it **accessible to everyone**.

## **Lightning-Fast Setup**

Getting started is **incredibly easy**! All you need is **Node.js 22.12 or newer** (24 recommended) and **Docker**.

```bash
git clone <your-fork-url> kalendo
cd kalendo
npm install
cp .env.example .env
docker compose up -d
npm run db:migrate
npm run seed
npm run dev
```

**That's it!** Your app is now **live** on http://localhost:3000 together with the **outbox worker**. Docker starts **Postgres 17** on host port 5433 and **Mailpit** on 1025 (SMTP) and 8025 (web UI). `db:migrate` applies the SQL migrations and creates the **restricted app role**, and `seed` creates **two demo businesses**. Want a fresh start? Just run `npm run db:reset && npm run seed`. **Easy!**

## **Try the Amazing Demo**

Set `DEMO_MODE=1` and click **Try the demo** on the landing page to be **instantly** signed into **Glow Studio**, a fictional salon with about five weeks of bookings, three staff members and a customer list. **No password, no sign-up, no hassle!** Public booking pages live at `/b/glow-studio` and `/b/northside-physio`. In demo mode, payments use the **built-in signed fake checkout** and emails are printed to the server log, so **nothing needs credentials**.

## **Payments Made Effortless**

Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe`, put the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET`, add a test-mode `STRIPE_SECRET_KEY`, and pay with `4242 4242 4242 4242`. **Webhooks are idempotent**, so a redelivery is a **harmless no-op**. No Stripe keys? **No problem!** A fake provider signs its own events and sends them through the **exact same pipeline**.

## **Environment**

**Required:** `DATABASE_URL`, `DATABASE_ADMIN_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`. **Optional:** `MAIL_TRANSPORT`, `SMTP_HOST`, `SMTP_PORT`, `EMAIL_FROM`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`, `FAKE_PAYMENTS_WEBHOOK_SECRET`, `DEMO_MODE`, `CRON_SECRET`.

## **Rock-Solid Quality**

Run `npm test`, `npm run test:integration`, `npm run test:e2e` or simply `npm run ci` to run **everything CI runs, in order**. **Quality you can trust!**

## **License**

**MIT License.**