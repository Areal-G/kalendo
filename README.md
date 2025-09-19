# Kalendo

Booking page + shared team calendar for salons, clinics and studios. Multi-tenant, one dashboard per business.

- public booking page per business (service, staff, date/time, details)
- week calendar for the team, staff hours, breaks, time off
- no double bookings: Postgres exclusion constraint, tenants split by RLS

dev:

```
npm install
cp .env.example .env
docker compose up -d      # postgres 17 on 5433, mailpit on 1025/8025
npm run db:migrate
npm run seed              # two demo businesses
npm run dev               # http://localhost:3000 + outbox worker
```

reset: `npm run db:reset && npm run seed`

needs node 22.12+ and docker. stripe keys optional, a fake provider handles deposits without them.

MIT