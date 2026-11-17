import type { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

import * as schema from "@/db/schema";
import { demoClient, waitForDemoData } from "@/server/demo/data";

/**
 * The demo runs on PGlite: real Postgres compiled to WebAssembly, in memory,
 * with the real migrations, Row Level Security and exclusion constraint. Each
 * server instance has its own copy (see demo/data.ts).
 *
 * The app's handle waits until the data is ready before every query, so
 * nothing observes a half-loaded or half-reset database. Loads themselves run
 * inside a data task and skip the wait.
 */
const GATED = new Set<PropertyKey>(["query", "exec", "transaction"]);

const demoDatabaseHandle = new Proxy({} as PGlite, {
  get(_, property) {
    if (GATED.has(property)) {
      return async (...args: unknown[]) => {
        await waitForDemoData();
        const client = demoClient();
        return (Reflect.get(client, property) as (...a: unknown[]) => unknown).apply(client, args);
      };
    }
    const client = demoClient();
    const value: unknown = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

function createDatabase() {
  return drizzle({ client: demoDatabaseHandle, schema });
}

export type Database = ReturnType<typeof createDatabase>;
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
/** Either the root handle or a transaction - for helpers that work in both. */
export type Queryable = Database | Tx;

// One handle per process. In dev, Next.js hot reload re-evaluates modules, so
// it lives on globalThis to survive edits.
const globalForDb = globalThis as unknown as { __kalendoDb?: Database };

export function getDb(): Database {
  globalForDb.__kalendoDb ??= createDatabase();
  return globalForDb.__kalendoDb;
}
