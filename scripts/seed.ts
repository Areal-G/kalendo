/**
 * Seeds the sample businesses (see src/server/seed.ts) for one owner login:
 * SEED_OWNER_EMAIL / SEED_OWNER_PASSWORD / SEED_OWNER_NAME, with local
 * defaults. Skips when that owner already exists, so it is safe to re-run.
 *
 *   npm run seed            # once, on a migrated database
 *   npm run db:reset && npm run seed   # start over
 */
import "./load-env";

import postgres from "postgres";

import { closeDb, normalizeDatabaseUrl } from "@/server/db/client";
import { seedSampleData } from "@/server/seed";

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to seed sample data with NODE_ENV=production.");
}
const adminUrl = process.env.DATABASE_ADMIN_URL;
if (!adminUrl) throw new Error("DATABASE_ADMIN_URL is not set");
const owner = {
  name: process.env.SEED_OWNER_NAME || "Emily Carter",
  email: process.env.SEED_OWNER_EMAIL || "owner@example.com",
  password: process.env.SEED_OWNER_PASSWORD || "kalendo-local-password",
};

const admin = postgres(normalizeDatabaseUrl(adminUrl), { max: 1, onnotice: () => {} });
try {
  const result = await seedSampleData(admin, owner);
  if (!result.seeded) {
    console.log(`Sample data already present for ${owner.email}; nothing to do.`);
  } else {
    for (const org of result.orgs)
      console.log(`Seeded ${org.name} (/b/${org.slug}) with ${org.bookings} bookings`);
    console.log(`\nSign in at http://localhost:3000/sign-in as ${owner.email}`);
  }
} finally {
  await admin.end();
  await closeDb();
}
