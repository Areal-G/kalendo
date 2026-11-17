import { describe, expect, it, vi } from "vitest";

import { LogMailer } from "./mailer";

describe("LogMailer", () => {
  it("never sends, and doesn't log the full address", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    await new LogMailer().send({ to: "eva@example.com", subject: "Hi", text: "", html: "" });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("ev***@example.com"));
    expect(log.mock.calls[0]![0]).not.toContain("eva@example.com");
    log.mockRestore();
  });
});
