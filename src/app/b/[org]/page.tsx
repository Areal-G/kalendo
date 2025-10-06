import { and, eq, inArray } from "drizzle-orm";
import type { Metadata } from "next";
import { MailCheck, ShieldCheck, Zap } from "lucide-react";
import { notFound } from "next/navigation";

import { BookingWidget } from "@/components/booking/booking-widget";
import { Logo } from "@/components/brand/logo";
import { organizations, services, staffMembers, staffServices } from "@/db/schema";
import { orgIdBySlug, withTenant } from "@/server/db/tenant";

async function load(slug: string) {
  const orgId = await orgIdBySlug(slug);
  if (!orgId) return null;
  return withTenant({ orgId }, async (tx) => {
    const [org] = await tx.select().from(organizations).where(eq(organizations.id, orgId));
    const serviceRows = await tx
      .select()
      .from(services)
      .where(eq(services.active, true))
      .orderBy(services.name);
    const links = serviceRows.length
      ? await tx
          .select({
            serviceId: staffServices.serviceId,
            staffId: staffMembers.id,
            name: staffMembers.displayName,
            color: staffMembers.color,
          })
          .from(staffServices)
          .innerJoin(
            staffMembers,
            and(eq(staffMembers.id, staffServices.staffId), eq(staffMembers.active, true)),
          )
          .where(
            inArray(
              staffServices.serviceId,
              serviceRows.map((s) => s.id),
            ),
          )
      : [];
    return {
      org: org!,
      services: serviceRows
        .map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          durationMinutes: s.durationMinutes,
          priceCents: s.priceCents,
          depositCents: s.depositCents,
          staff: links
            .filter((l) => l.serviceId === s.id)
            .map((l) => ({ id: l.staffId, name: l.name, color: l.color })),
        }))
        .filter((s) => s.staff.length > 0),
    };
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ org: string }>;
}): Promise<Metadata> {
  const data = await load((await params).org);
  return { title: data ? `Book with ${data.org.name}` : "Not found" };
}

export default async function PublicBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const { org: slug } = await params;
  const data = await load(slug);
  if (!data) notFound();
  const { cancelled } = await searchParams;

  return (
    <div className="bg-hatch min-h-dvh">
      <div className="bg-brand h-1" />
      <header className="bg-background border-b">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:py-10">
          <div className="flex items-center gap-4">
            <span className="bg-brand grid size-14 shrink-0 place-items-center rounded-2xl text-xl font-semibold text-white shadow-md">
              {data.org.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <p className="text-highlight text-xs font-semibold tracking-[0.18em] uppercase">
                Book online
              </p>
              <h1 className="mt-1 font-mono text-3xl font-light">{data.org.name}</h1>
            </div>
          </div>
          <ul className="text-muted-foreground flex flex-wrap gap-2 text-xs">
            <li className="bg-background inline-flex items-center gap-1.5 rounded-full border px-3 py-1">
              <Zap className="text-highlight size-3.5" /> Instant confirmation
            </li>
            <li className="bg-background inline-flex items-center gap-1.5 rounded-full border px-3 py-1">
              <MailCheck className="text-highlight size-3.5" /> Email reminders
            </li>
            <li className="bg-background inline-flex items-center gap-1.5 rounded-full border px-3 py-1">
              <ShieldCheck className="text-highlight size-3.5" /> Cancel online
            </li>
          </ul>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 pb-16">
        {cancelled ? (
          <p className="border-warning/40 bg-warning/10 mb-5 rounded-xl border px-4 py-3 text-sm">
            Payment was cancelled, so your slot was not reserved. Pick a time to try again.
          </p>
        ) : null}
        <BookingWidget
          orgSlug={slug}
          orgTimeZone={data.org.timeZone}
          currency={data.org.currency}
          services={data.services}
        />
        <div className="text-muted-foreground mt-12 flex items-center justify-center gap-2 text-xs">
          Powered by <Logo className="text-xs" />
        </div>
      </main>
    </div>
  );
}
