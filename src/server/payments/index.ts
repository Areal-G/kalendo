import { FakePaymentProvider } from "./fake";
import type { PaymentProvider } from "./types";

export * from "./types";

const globalForPayments = globalThis as unknown as { __kalendoPayments?: PaymentProvider };

/**
 * Always the local fake: the demo never talks to Stripe, even if keys are set. The choice is made
 * once per process; nothing else in the app branches on it.
 */
export function getPaymentProvider(): PaymentProvider {
  globalForPayments.__kalendoPayments ??= new FakePaymentProvider(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    process.env.FAKE_PAYMENTS_WEBHOOK_SECRET ?? "dev-fake-webhook-secret",
  );
  return globalForPayments.__kalendoPayments;
}

export function setPaymentProvider(provider: PaymentProvider): void {
  globalForPayments.__kalendoPayments = provider;
}
