import { sql } from "drizzle-orm";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { getDb } from "@/server/db/client";
import { orgIdBySlug, withTenant } from "@/server/db/tenant";

import { calendarShiftDays, resetDemoData, waitForDemoData } from "./data";

/** Ground truth, bypassing RLS: every row id the seed produced, in a stable order. */
async function snapshot() {
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`set local role postgres`);
    const { rows } = await tx.execute<{ kind: string; ids: string[] }>(sql`
      select 'users' as kind, array_agg(id order by id) as ids from auth_users
      union all select 'orgs', array_agg(id::text order by id) from organizations
      union all select 'staff', array_agg(id::text order by id) from staff_members
      union all select 'services', array_agg(id::text order by id) from services
      union all select 'customers', array_agg(id::text order by id) from customers
      union all select 'bookings', array_agg(id::text order by id) from bookings`);
    return Object.fromEntries(rows.map((r) => [r.kind, r.ids]));
  });
}

describe("in-memory demo data", () => {
  // First, while nothing has been loaded yet in this process.
  it("serializes resets fired during the startup seed, and app queries wait for them", async () => {
    const firstQuery = orgIdBySlug("glow-studio");
    const loads = [
      waitForDemoData(),
      resetDemoData(),
      orgIdBySlug("northside-physio"),
      resetDemoData(),
      waitForDemoData(),
      resetDemoData(),
    ];
    await expect(firstQuery).resolves.toBe("00000000-0000-4000-9000-000000000001");
    const results = await Promise.all(loads);
    expect(results[2]).toBe("00000000-0000-4000-9000-000000000002");

    // One copy of the data, not several interleaved ones.
    const ids = await snapshot();
    expect(ids.users).toHaveLength(3);
    expect(ids.orgs).toHaveLength(2);
    expect(new Set(ids.bookings).size).toBe(ids.bookings!.length);
  });

  it("loads identical ids every time, so instances agree", async () => {
    const before = await snapshot();
    expect(before.users![0]).toBe("00000000-0000-4000-8000-000000000001");
    expect(before.bookings!.length).toBeGreaterThan(50);

    await resetDemoData();
    expect(await snapshot()).toEqual(before);
  });

  it("a reset discards visitors' changes", async () => {
    const orgId = (await orgIdBySlug("glow-studio"))!;
    const names = () =>
      withTenant({ orgId }, async (tx) => {
        const { rows } = await tx.execute<{ name: string }>(
          sql`select name from services order by name`,
        );
        return rows.map((r) => r.name);
      });
    const seeded = await names();
    await withTenant({ orgId }, (tx) => tx.execute(sql`update services set name = 'Renamed'`));
    expect(await names()).not.toEqual(seeded);

    await resetDemoData();
    expect(await names()).toEqual(seeded);
  });

  it("runs the app as the least-privileged role, so Row Level Security applies", async () => {
    await waitForDemoData();
    const { rows } = await getDb().execute<{ role: string; orgs: number }>(
      sql`select current_user as role, (select count(*)::int from organizations) as orgs`,
    );
    // No tenant bound: RLS hides every organization.
    expect(rows[0]).toEqual({ role: "kalendo_app", orgs: 0 });
  });
});

describe("calendarShiftDays", () => {
  const day = (iso: string) => Temporal.PlainDate.from(iso);
  it("moves by whole weeks to the week around the given day", () => {
    expect(calendarShiftDays(day("2026-11-16"), day("2026-11-16"))).toBe(0);
    expect(calendarShiftDays(day("2026-11-16"), day("2026-11-19"))).toBe(0);
    expect(calendarShiftDays(day("2026-11-16"), day("2026-11-20"))).toBe(7);
    expect(calendarShiftDays(day("2026-11-16"), day("2027-02-01"))).toBe(77);
  });
});
