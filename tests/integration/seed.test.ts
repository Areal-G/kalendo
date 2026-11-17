import { describe, expect, it } from "vitest";

import { getAuth } from "@/server/auth/auth";
import { seedSampleData } from "@/server/seed";
import { createPublicBooking } from "@/server/services/bookings";

import { admin, createTestOrg, inDaysAt, useCleanDatabase } from "./helpers";

const owner = { name: "Sam Owner", email: "sam@example.com", password: "sample-password-123" };

describe("sample data seed", () => {
  useCleanDatabase();

  it(
    "creates both businesses for the configured owner and leaves other tenants alone",
    { timeout: 180_000 },
    async () => {
      const existing = await createTestOrg("existing-salon");
      await createPublicBooking(existing.slug, {
        serviceId: existing.serviceId,
        staffId: null,
        start: inDaysAt(3, 10).toISOString(),
        customer: { name: "Eva", email: "eva@example.com", phone: null },
      });
      const existingOutbox = await admin`select id, status from outbox order by id`;
      expect(existingOutbox.length).toBeGreaterThan(0);

      const result = await seedSampleData(admin, owner);
      expect(result.seeded).toBe(true);
      expect(result.orgs.map((o) => o.slug)).toEqual(["glow-studio", "northside-physio"]);

      const roles = await admin`
        select o.slug, m.role from memberships m
        join organizations o on o.id = m.org_id
        join auth_users u on u.id = m.user_id
        where u.email = ${owner.email} order by o.slug`;
      expect(roles).toEqual([
        { slug: "glow-studio", role: "owner" },
        { slug: "northside-physio", role: "owner" },
      ]);
      const [{ n }] = (await admin`
        select count(*)::int as n from bookings where org_id <> ${existing.orgId}`) as [
        { n: number },
      ];
      expect(n).toBeGreaterThan(50);
      // Seed-time messages are not delivered to fictional customers...
      const undelivered = await admin`
        select 1 from outbox where status <> 'done' and org_id <> ${existing.orgId}`;
      expect(undelivered).toHaveLength(0);
      // ...and other tenants' pending messages are untouched.
      expect(
        await admin`select id, status from outbox where org_id = ${existing.orgId} order by id`,
      ).toEqual(existingOutbox);

      const signIn = await getAuth().api.signInEmail({
        body: { email: owner.email, password: owner.password },
      });
      expect(signIn.user.email).toBe(owner.email);
    },
  );

  it("is a no-op when the owner already exists", async () => {
    await getAuth().api.signUpEmail({ body: owner });
    expect(await seedSampleData(admin, owner)).toEqual({ seeded: false, orgs: [] });
    expect(await admin`select 1 from organizations`).toHaveLength(0);
  });
});
