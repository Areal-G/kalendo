import { z } from "zod";

/**
 * Server environment, validated once on first use (not at import time, so
 * `next build` and unit tests don't need a full .env).
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  // NEXT_PUBLIC_APP_URL is inlined at build time (see netlify.toml), so the
  // deployed demo needs no runtime variable besides the secret.
  BETTER_AUTH_URL: z.url().default(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  EMAIL_FROM: z.string().default("Kalendo <no-reply@kalendo.local>"),
  FAKE_PAYMENTS_WEBHOOK_SECRET: z.string().default("dev-fake-webhook-secret"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n");
      throw new Error(`Invalid environment variables:\n${issues}`);
    }
    cached = parsed.data;
  }
  return cached;
}
