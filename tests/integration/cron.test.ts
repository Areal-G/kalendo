import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as cronOutboxPost, GET as cronOutbox } from "@/app/api/cron/outbox/route";
import { getMailer, MemoryMailer } from "@/server/mail/mailer";
import { createPublicBooking } from "@/server/services/bookings";

import { admin, createTestOrg, inDaysAt, useCleanDatabase } from "./helpers";

const SECRET = "test-cron-secret-0123456789";

function request(path: string, init: RequestInit & { secret?: string } = {}) {
  const headers = new Headers(init.headers);
  if (init.secret !== undefined) headers.set("authorization", `Bearer ${init.secret}`);
  return new Request(`http://localhost:3000${path}`, { ...init, headers });
}

describe("outbox cron endpoint", () => {
  useCleanDatabase();
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", SECRET);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects missing and wrong secrets", async () => {
    expect((await cronOutbox(request("/api/cron/outbox"))).status).toBe(401);
    expect((await cronOutbox(request("/api/cron/outbox", { secret: "nope" }))).status).toBe(401);
    expect(
      (await cronOutboxPost(request("/api/cron/outbox", { method: "POST", secret: `${SECRET}x` })))
        .status,
    ).toBe(401);
  });

  it("fails closed when CRON_SECRET is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await cronOutbox(request("/api/cron/outbox", { secret: "" }))).status).toBe(401);
  });

  it("delivers due messages and marks them done", async () => {
    const org = await createTestOrg("cron-salon");
    await createPublicBooking(org.slug, {
      serviceId: org.serviceId,
      staffId: null,
      start: inDaysAt(3, 10).toISOString(),
      customer: { name: "Eva", email: "eva@example.com", phone: null },
      customerTimeZone: "Europe/Madrid",
    });
    const mailer = getMailer() as MemoryMailer;
    expect(mailer).toBeInstanceOf(MemoryMailer);
    mailer.sent.length = 0;

    const res = await cronOutbox(request("/api/cron/outbox", { secret: SECRET }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.batches[0]).toMatchObject({ claimed: 1, succeeded: 1 });
    expect(mailer.sent.map((m) => m.to)).toEqual(["eva@example.com"]);
    const rows = await admin`select topic, status from outbox order by id`;
    expect(rows).toEqual([
      { topic: "booking.confirmed", status: "done" },
      { topic: "booking.reminder", status: "pending" }, // not due yet
    ]);
  });
});
