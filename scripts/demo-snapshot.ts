/**
 * Build step (`npm run build`): seeds the demo database once and saves the
 * snapshot every server instance starts from (see src/server/demo/data.ts).
 */
import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { SNAPSHOT_PATH, writeDemoSnapshot } from "@/server/demo/data";

// The seed signs up the demo accounts through Better Auth, which requires a
// secret. Nothing signed with it ends up in the snapshot.
process.env.BETTER_AUTH_SECRET ||= randomBytes(32).toString("hex");

const started = Date.now();
await mkdir(path.dirname(SNAPSHOT_PATH), { recursive: true });
const { orgs } = await writeDemoSnapshot();
for (const org of orgs)
  console.log(`Seeded ${org.name} (/b/${org.slug}) with ${org.bookings} bookings`);
console.log(`Demo snapshot written to ${SNAPSHOT_PATH} in ${Date.now() - started} ms`);
