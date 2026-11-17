/**
 * Build-time database step for hosted deploys (`npm run vercel-build`): apply
 * migrations. Skips quietly when DATABASE_ADMIN_URL isn't configured (e.g. a
 * preview without a DB), so the build itself never depends on it.
 */
import "./load-env";

import { runMigrations } from "./migrate-lib";

const adminUrl = process.env.DATABASE_ADMIN_URL;
const appUrl = process.env.DATABASE_URL;
if (!adminUrl || !appUrl) {
  console.log("[deploy-db] DATABASE_ADMIN_URL / DATABASE_URL not set; skipping migrations.");
  process.exit(0);
}

await runMigrations(adminUrl, appUrl);
console.log("[deploy-db] migrations applied");
