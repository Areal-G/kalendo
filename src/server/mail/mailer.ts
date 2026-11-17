import nodemailer, { type Transporter } from "nodemailer";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface Mailer {
  send(message: EmailMessage): Promise<void>;
}

export class SmtpMailer implements Mailer {
  private readonly transport: Transporter;

  constructor(
    options: { host: string; port: number },
    private readonly from: string,
  ) {
    this.transport = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: false,
    });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transport.sendMail({ from: this.from, ...message });
  }
}

/** Collects messages in memory. Used by tests and by `MAIL_TRANSPORT=memory`. */
export class MemoryMailer implements Mailer {
  readonly sent: EmailMessage[] = [];
  failNext = 0;

  async send(message: EmailMessage): Promise<void> {
    if (this.failNext > 0) {
      this.failNext--;
      throw new Error("Simulated SMTP failure");
    }
    this.sent.push(message);
  }
}

/**
 * Logs a one-line summary and drops the message, so no address receives real
 * email and no SMTP server is needed.
 */
export class LogMailer implements Mailer {
  async send(message: EmailMessage): Promise<void> {
    console.info(`[mail] (not sent) to=${maskEmail(message.to)} subject="${message.subject}"`);
  }
}

function maskEmail(email: string): string {
  const [user = "", domain = ""] = email.split("@");
  return `${user.slice(0, 2)}***@${domain}`;
}

/**
 * `MAIL_TRANSPORT`: `smtp` (default), `memory` (tests) or `log`.
 */
function createMailer(): Mailer {
  const transport = process.env.MAIL_TRANSPORT || "smtp";
  if (transport === "memory") return new MemoryMailer();
  if (transport === "log") return new LogMailer();
  return new SmtpMailer(
    {
      host: process.env.SMTP_HOST ?? "localhost",
      port: Number(process.env.SMTP_PORT ?? 1025),
    },
    process.env.EMAIL_FROM ?? "Kalendo <no-reply@kalendo.local>",
  );
}

const globalForMail = globalThis as unknown as { __kalendoMailer?: Mailer };

export function getMailer(): Mailer {
  globalForMail.__kalendoMailer ??= createMailer();
  return globalForMail.__kalendoMailer;
}

/** Test hook. */
export function setMailer(mailer: Mailer): void {
  globalForMail.__kalendoMailer = mailer;
}
