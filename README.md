# Kalendo (demo build)

**This branch is the portfolio demo running at [kalendo.arealjagema.com](https://kalendo.arealjagema.com). It keeps its data in memory and needs no database or external services. The full app (PostgreSQL, Stripe, email, background worker) and its documentation live on [`main`](https://github.com/Areal-G/kalendo/tree/main).**

Click **Try the demo** to land in **Glow Studio**, a fictional salon with about five weeks of bookings, three staff members and a customer list. The public booking pages are `/b/glow-studio` (New York) and `/b/northside-physio` (Chicago).

## How the demo differs from `main`

- **Database:** [PGlite](https://pglite.dev), real Postgres compiled to WebAssembly, in memory, with the same migrations, Row Level Security and no-overlap constraint. The app still connects as the restricted `kalendo_app` role.
- **Data:** `npm run build` seeds the demo businesses once, through the real services, and saves a snapshot (`.demo/snapshot.tar.gz`). Every server instance starts from that snapshot, so ids, sessions and links work across instances, and moves the calendar by whole weeks to stay around today.
- **Resets:** each **Try the demo** sign-in restores the instance's data to the snapshot. Changes otherwise last until the instance is recycled.
- **Accounts:** one shared owner account, signed in on the server. Sign-up and account changes are disabled; sessions live in a signed cookie.
- **Services:** payments always use the built-in fake checkout, emails are only logged, and the outbox is processed after each request instead of by a worker.

## Run it locally

Requires Node.js 22.12 or newer.

```bash
npm ci
cp .env.example .env   # set BETTER_AUTH_SECRET (openssl rand -base64 32)
npm run build && npm start
```

`npm run dev` works too; without a snapshot it seeds on the first request, which takes several seconds.

| Script                                  | What it does                                   |
| --------------------------------------- | ---------------------------------------------- |
| `npm run build` / `npm start`           | Seed the snapshot, build, and serve.           |
| `npm run dev`                           | Development server.                            |
| `npm run typecheck` / `lint` / `format` | TypeScript, ESLint, Prettier.                  |
| `npm test`                              | Unit tests, including the demo data lifecycle. |

## Deploy (Netlify)

`netlify.toml` sets the build command, Node 22, the public URL and the runtime files to ship. The only variable to set in Netlify is `BETTER_AUTH_SECRET` (at least 32 characters).
