import { AsyncLocalStorage } from "node:async_hooks";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/pglite/migrator";
import { Temporal } from "temporal-polyfill";

import { getDb, type Tx } from "@/server/db/client";

import { seedDemoData, type SeedResult } from "./seed";

/**
 * Lifecycle of the in-memory demo database (PGlite: real Postgres in
 * WebAssembly, with the real migrations and Row Level Security).
 *
 * Every serverless instance holds its own copy, and the copies must be
 * identical: a session cookie or a link made on one instance is used on the
 * next. So the data is seeded once, at build time, into a snapshot that every
 * instance loads (seeding through the real services takes several seconds,
 * too long for a cold start). Ids come from one sequence instead of
 * gen_random_uuid(), so even a live seed (no snapshot, e.g. `next dev`)
 * produces the same ids. On load, the calendar moves by whole weeks to stay
 * around today, keeping each booking's weekday and wall-clock time.
 *
 * Loads - the startup and every reset - run one at a time, and app queries
 * wait for all scheduled loads (see db/client.ts).
 */

export const SNAPSHOT_PATH = path.join(process.cwd(), ".demo", "snapshot.tar.gz");

/**
 * Every application table, children first. Rate-limit counters are left out on
 * purpose: they must survive resets, which every demo sign-in triggers.
 */
const DATA_TABLES = [
  "audit_log",
  "outbox",
  "webhook_events",
  "payments",
  "bookings",
  "customers",
  "holidays",
  "time_off",
  "date_overrides",
  "breaks",
  "working_hours",
  "staff_services",
  "services",
  "staff_members",
  "invitations",
  "memberships",
  "organizations",
  "auth_sessions",
  "auth_accounts",
  "auth_verifications",
  "auth_users",
] as const;

/** Runs after the migrations, as the superuser. */
const DETERMINISTIC_IDS = `
  CREATE SCHEMA demo;
  CREATE SEQUENCE demo.id_seq;
  CREATE FUNCTION demo.next_id() RETURNS uuid LANGUAGE sql AS $$
    SELECT ('00000000-0000-4000-8000-' || lpad(to_hex(nextval('demo.id_seq')), 12, '0'))::uuid
  $$;
  GRANT USAGE ON SCHEMA demo TO kalendo_app;
  GRANT USAGE ON SEQUENCE demo.id_seq TO kalendo_app;
  DO $$
  DECLARE
    c record;
  BEGIN
    FOR c IN
      SELECT table_name, column_name, data_type FROM information_schema.columns
       WHERE table_schema = 'public'
         AND (column_default = 'gen_random_uuid()' OR (table_name LIKE 'auth\\_%' AND column_name = 'id'))
    LOOP
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT demo.next_id()::%s',
        c.table_name, c.column_name, c.data_type
      );
    END LOOP;
  END
  $$;
  -- The date the calendar was seeded around.
  CREATE TABLE demo.calendar (anchor date NOT NULL);
`;

const inDataTask = new AsyncLocalStorage<true>();
let instance: PGlite | undefined;
let loaded = false;
let queue: Promise<void> | undefined;

/** The database behind getDb(). Only valid inside a load or after waitForDemoData(). */
export function demoClient(): PGlite {
  if (!instance) throw new Error("The demo data is not loaded");
  return instance;
}

const today = () => Temporal.Now.plainDateISO("UTC");

/** Runs `fn` as the superuser instead of the application role. */
function asSuperuser<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`set local role postgres`);
    return fn(tx);
  });
}

/** Migrations, deterministic ids and the seed, into the empty `instance`. */
async function seedFromScratch(anchor: Temporal.PlainDate): Promise<SeedResult> {
  const db = getDb();
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  await demoClient().exec(DETERMINISTIC_IDS);
  await demoClient().query("insert into demo.calendar (anchor) values ($1)", [anchor.toString()]);
  // The seed goes through the real services, as the application role: they
  // rely on Row Level Security to scope their queries to one business.
  await demoClient().exec("SET ROLE kalendo_app");
  const result = await seedDemoData(anchor);
  await demoClient().exec("RESET ROLE");
  // Don't "email" fictional customers about historical bookings.
  await db.execute(
    sql`update outbox set status = 'done', processed_at = now(), last_error = 'skipped by seed'`,
  );
  return result;
}

/** Whole weeks from `anchor` to the week around `day`, so weekdays stay put. */
export function calendarShiftDays(anchor: Temporal.PlainDate, day: Temporal.PlainDate): number {
  return Math.round(anchor.until(day).days / 7) * 7;
}

/** Moves the seeded calendar to the week around `day`, in each business's own time zone. */
async function moveCalendar(day: Temporal.PlainDate): Promise<void> {
  const { rows } = await demoClient().query<{ anchor: string }>(
    "select anchor::text from demo.calendar",
  );
  const days = calendarShiftDays(Temporal.PlainDate.from(rows[0]!.anchor), day);
  if (days === 0) return;
  // Through a copy: shifting rows in place would collide with not-yet-moved
  // bookings of the same staff member under the no-overlap constraint.
  await demoClient().transaction(async (tx) => {
    const shift = (column: string) =>
      `${column} = ((s.${column} at time zone o.time_zone) + make_interval(days => ${days})) at time zone o.time_zone`;
    await tx.exec(`
      create temp table shifted on commit drop as table public.bookings;
      update shifted s set ${["starts_at", "ends_at", "blocked_from", "blocked_until", "hold_expires_at"].map(shift).join(", ")}
        from public.organizations o where o.id = s.org_id;
      delete from public.bookings;
      insert into public.bookings select * from shifted;
      update demo.calendar set anchor = anchor + ${days};
      -- The seed's holidays fall in the anchor's year.
      update public.holidays set date = make_date(
        (select extract(year from anchor)::int from demo.calendar),
        extract(month from date)::int, extract(day from date)::int);
    `);
  });
}

/** Keeps a copy of every table (and of the id sequence), which a reset restores. */
async function keepPristineCopy(): Promise<void> {
  await demoClient().exec(`
    create schema pristine;
    create table pristine.id_seq as select last_value from demo.id_seq;
    ${DATA_TABLES.map((t) => `create table pristine.${t} as table public.${t};`).join("\n")}
  `);
}

async function startUp(): Promise<void> {
  const snapshot = await readFile(SNAPSHOT_PATH).catch(() => undefined);
  instance = await PGlite.create({
    extensions: { btree_gist },
    ...(snapshot ? { loadDataDir: new Blob([snapshot]) } : {}),
  });
  if (snapshot) await moveCalendar(today());
  else await seedFromScratch(today());
  await keepPristineCopy();
  // From here on the app runs as the least-privileged role, so Row Level
  // Security applies exactly as on the full app.
  await demoClient().exec("SET ROLE kalendo_app");
}

async function restorePristineCopy(): Promise<void> {
  await asSuperuser(async (tx) => {
    await tx.execute(sql.raw(`truncate ${DATA_TABLES.join(", ")} cascade`));
    for (const table of [...DATA_TABLES].reverse()) {
      await tx.execute(sql.raw(`insert into public.${table} select * from pristine.${table}`));
    }
    await tx.execute(sql`select setval('demo.id_seq', (select last_value from pristine.id_seq))`);
  });
}

async function load(): Promise<void> {
  if (loaded) return restorePristineCopy();
  try {
    await startUp();
    loaded = true;
  } catch (err) {
    await instance?.close().catch(() => {});
    instance = undefined;
    throw err;
  }
}

/** Queues a load behind any earlier one. A failed start-up is retried by the next caller. */
function scheduleLoad(): Promise<void> {
  const previous = queue;
  const task = (async () => {
    await previous?.catch(() => {});
    await inDataTask.run(true, load);
  })();
  queue = task;
  task.catch(() => {
    if (queue === task) queue = undefined;
  });
  return task;
}

/**
 * Resolves once the demo data is ready: loads it on first use and waits for
 * any reset in progress. Queries made by a load itself don't wait.
 */
export function waitForDemoData(): Promise<void> {
  if (inDataTask.getStore()) return Promise.resolve();
  return queue ?? scheduleLoad();
}

/** Restores the data as it was after start-up, once any load in progress is done. */
export function resetDemoData(): Promise<void> {
  return scheduleLoad();
}

/** Build step: seeds a fresh database and saves it as the snapshot instances start from. */
export async function writeDemoSnapshot(file = SNAPSHOT_PATH): Promise<SeedResult> {
  instance = await PGlite.create({ extensions: { btree_gist } });
  try {
    const result = await inDataTask.run(true, () => seedFromScratch(today()));
    const dump = await instance.dumpDataDir("gzip");
    await writeFile(file, Buffer.from(await dump.arrayBuffer()));
    return result;
  } finally {
    await instance.close();
    instance = undefined;
  }
}
