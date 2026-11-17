import { after } from "next/server";

import { getMailer } from "@/server/mail/mailer";
import { getPaymentProvider } from "@/server/payments";
import { createHandlers } from "@/worker/handlers";
import { type BatchResult, processOutboxBatch, runMaintenance } from "@/worker/processor";

/**
 * One worker tick: housekeeping, then deliver whatever is due. Same code path
 * as the worker on the full app.
 */
export async function drainOutbox(
  options: { batches?: number } = {},
): Promise<{ maintenance: Awaited<ReturnType<typeof runMaintenance>>; batches: BatchResult[] }> {
  const handlers = createHandlers({
    mailer: getMailer(),
    payments: getPaymentProvider(),
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  });
  const maintenance = await runMaintenance();
  const batches: BatchResult[] = [];
  for (let i = 0; i < (options.batches ?? 5); i++) {
    const result = await processOutboxBatch(handlers);
    batches.push(result);
    if (result.claimed === 0) break;
  }
  return { maintenance, batches };
}

/**
 * The demo has no worker, so after a request that may have enqueued messages,
 * deliver them once the response is sent (`after`).
 */
export function drainOutboxAfterResponse(): void {
  after(async () => {
    try {
      await drainOutbox({ batches: 1 });
    } catch (err) {
      console.error("[outbox] in-request drain failed", err);
    }
  });
}
