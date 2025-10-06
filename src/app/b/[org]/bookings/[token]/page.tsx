import { CalendarCheck2, CircleAlert, Clock3, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { orgIdBySlug, withTenant } from "@/server/db/tenant";
import { formatDateTime, formatMoney } from "@/server/format";
import { findBookingByToken, loadOrg } from "@/server/services/bookings";

import { CancelOwnBooking } from "./cancel-own-booking";

export const metadata: Metadata = { title: "Your booking", robots: { index: false } };

export default async function CustomerBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string; token: string }>;
  searchParams: Promise<{ new?: string; paid?: string }>;
}) {
  const { org: slug, token } = await params;
  const sp = await searchParams;
  const orgId = await orgIdBySlug(slug);
  if (!orgId || token.length > 64) notFound();
  const data = await withTenant({ orgId }, async (tx) => {
    const found = await findBookingByToken(tx, token);
    return found ? { ...found, org: await loadOrg(tx, orgId) } : null;
  });
  if (!data) notFound();

  const { booking, org } = data;
  const zone = booking.customerTimeZone ?? org.timeZone;
  const upcoming = booking.startsAt > new Date();
  const header = {
    confirmed: {
      icon: CalendarCheck2,
      title: sp.new || sp.paid ? "You're booked!" : "Booking confirmed",
      tone: "text-success",
    },
    pending_payment: { icon: Clock3, title: "Waiting for your deposit", tone: "text-warning" },
    cancelled: { icon: XCircle, title: "Booking cancelled", tone: "text-destructive" },
    expired: {
      icon: CircleAlert,
      title: "This reservation expired",
      tone: "text-muted-foreground",
    },
  }[booking.status];
  const Icon = header.icon;

  return (
    <div className="bg-hatch min-h-dvh">
      <div className="bg-brand h-1" />
      <div className="grid place-items-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-md">
          <Card className="overflow-hidden rounded-2xl shadow-[0_12px_40px_-12px_rgb(74_44_29/0.2)]">
            <div className="bg-accent/50 border-b px-6 pt-8 pb-6 text-center">
              <span
                className={`bg-background mx-auto grid size-16 place-items-center rounded-full border shadow-sm ${header.tone}`}
              >
                <Icon className="size-8" />
              </span>
              <h1 className="mt-4 font-mono text-3xl font-light" data-testid="booking-status">
                {header.title}
              </h1>
              {booking.status === "confirmed" ? (
                <p className="text-muted-foreground mt-2 text-sm">
                  A confirmation was sent to {data.customerEmail}.
                </p>
              ) : null}
            </div>
            <CardContent className="grid gap-5 pt-6">
              <dl className="divide-y rounded-xl border text-sm">
                <Row label="Where" value={org.name} />
                <Row label="What" value={data.serviceName} />
                <Row label="With" value={data.staffName} />
                <Row label="When" value={formatDateTime(booking.startsAt, zone)} />
                {booking.depositCents > 0 ? (
                  <Row label="Deposit" value={formatMoney(booking.depositCents, org.currency)} />
                ) : null}
              </dl>
              {booking.status === "confirmed" && upcoming ? (
                <CancelOwnBooking orgSlug={slug} token={token} />
              ) : null}
              {booking.status !== "confirmed" && booking.status !== "pending_payment" ? (
                <Button asChild>
                  <Link href={`/b/${slug}`}>Book another time</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
          <div className="text-muted-foreground mt-8 flex items-center justify-center gap-2 text-xs">
            Powered by <Logo className="text-xs" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
