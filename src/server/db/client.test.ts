import { describe, expect, it } from "vitest";

import { normalizeDatabaseUrl } from "./client";

describe("normalizeDatabaseUrl", () => {
  it("drops channel_binding but keeps sslmode", () => {
    expect(
      normalizeDatabaseUrl(
        "postgres://u:p@ep-x-pooler.neon.tech/db?sslmode=require&channel_binding=require",
      ),
    ).toBe("postgres://u:p@ep-x-pooler.neon.tech/db?sslmode=require");
  });
});
