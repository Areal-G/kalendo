import {
  CalendarCheck2,
  CalendarPlus,
  Clock,
  DollarSign,
  ExternalLink,
  Globe2,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import { BookingStatusBadge } from "@/components/dashboard/booking-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, EmptyState, PageHeader, Stat } from "@/components/ui/misc";
import { localDateOf, localRange, startOfWeek, todayIn } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { getOrgContext, type OrgContext, readInOrg } from "@/server/context";
import { formatMoney, formatTime } from "@/server/format";
import { listBookings } from "@/server/services/bookings";
import { listCustomers } from "@/server/services/customers";

/** Data loading lives outside the component: it reads the clock, rendering shouldn't. */
async function loadOverview(ctx: OrgContext) {
  const tz = ctx.org.timeZone;
  const now = new Date();
  const today = todayIn(tz, now.getTime());
  const todayRange = localRange(today, 1, tz);
  const weekStart = startOfWeek(today);
  const week = localRange(weekStart, 7, tz);
  const staffId = ctx.can("bookings:write:any") ? undefined : (ctx.staffId ?? undefined);

  const data = await readInOrg(ctx, async (tx) => {
    const [todays, weekBookings, upcoming, customers] = await Promise.all([
      listBookings(tx, {
        from: todayRange.start,
        to: todayRange.end,
        staffId,
        statuses: ["confirmed", "pending_payment"],
      }),
      listBookings(tx, { from: week.start, to: week.end, staffId, statuses: ["confirmed"] }),
      listBookings(tx, {
        from: now,
        to: new Date(now.getTime() + 14 * 86_400_000),
        staffId,
        statuses: ["confirmed", "pending_payment"],
        limit: 8,
      }),
      ctx.can("customers:read")
        ? listCustomers(tx, { limit: 1000 }).then((c) => c.length)
        : Promise.resolve(null),
    ]);
    return { todays, weekBookings, upcoming, customers };
  });

  // Bookings per weekday for the mini chart, keyed by local date.
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = weekStart.add({ days: i });
    const key = date.toString();
    return {
      key,
      label: date.toLocaleString("en-US", { weekday: "short" }),
      isToday: key === today.toString(),
      count: data.weekBookings.filter((b) => localDateOf(b.startsAt, tz) === key).length,
    };
  });
  const nextUpId = data.todays.find((b) => b.endsAt > now)?.id ?? null;
  const todayLabel = today.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return { ...data, days, nextUpId, todayLabel };
}

function dayLabel(date: Date, tz: string) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: tz,
  });
}

export default async function OverviewPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params;
  const ctx = await getOrgContext(slug);
  const tz = ctx.org.timeZone;
  const { todays, weekBookings, upcoming, customers, days, nextUpId, todayLabel } =
    await loadOverview(ctx);
  const weekRevenue = weekBookings.reduce((sum, b) => sum + b.priceCents, 0);
  const maxDay = Math.max(1, ...days.map((d) => d.count));
  const bookingPath = `/b/${slug}`;
  const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}${bookingPath}`.replace(
    /^https?:\/\//,
    "",
  );

  // Group upcoming bookings by local day for the agenda list.
  const groups = new Map<string, typeof upcoming>();
  for (const b of upcoming) {
    const key = dayLabel(b.startsAt, tz);
    groups.set(key, [...(groups.get(key) ?? []), b]);
  }

  return (
    <>
      <PageHeader
        title={`Good to see you, ${ctx.user.name.split(" ")[0]}`}
        description={`${todayLabel} · ${ctx.org.name}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={bookingPath} target="_blank">
                <ExternalLink /> Booking page
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/app/${slug}/bookings?new=1`}>
                <CalendarPlus /> New booking
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Appointments today" value={todays.length} icon={<Clock />} />
        <Stat label="Booked this week" value={weekBookings.length} icon={<CalendarCheck2 />} />
        <Stat
          label="Revenue this week"
          value={formatMoney(weekRevenue, ctx.org.currency)}
          hint="From confirmed bookings"
          icon={<DollarSign />}
          tone="highlight"
        />
        <Stat label="Customers" value={customers ?? "-"} icon={<UsersRound />} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div className="grid gap-1">
              <CardTitle>This week</CardTitle>
              <CardDescription>Confirmed bookings per day</CardDescription>
            </div>
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              <TrendingUp className="text-primary size-3.5" /> {weekBookings.length} total
            </span>
          </CardHeader>
          <CardContent>
            <div className="flex h-40 items-end gap-3">
              {days.map((d) => (
                <div key={d.key} className="flex h-full flex-1 flex-col items-center gap-2">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      title={`${d.count} bookings`}
                      className={cn(
                        "w-full rounded-t-md transition-all",
                        d.isToday ? "bg-primary" : "bg-primary/25",
                      )}
                      style={{ height: `${Math.max(4, (d.count / maxDay) * 100)}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      d.isToday ? "text-foreground font-semibold" : "text-muted-foreground",
                    )}
                  >
                    {d.label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_80%_at_100%_0%,color-mix(in_oklch,var(--primary)_16%,transparent),transparent)]"
          />
          <CardHeader className="relative">
            <span className="bg-accent text-accent-foreground mb-2 grid size-9 place-items-center rounded-lg">
              <Globe2 className="size-4" />
            </span>
            <CardTitle>Your booking page</CardTitle>
            <CardDescription>
              Share this link on Instagram, Google or your website. Customers book and pay a deposit
              without calling you.
            </CardDescription>
          </CardHeader>
          <CardContent className="relative grid gap-3">
            <code className="bg-muted truncate rounded-md border px-3 py-2 text-xs">
              {bookingUrl}
            </code>
            <Button variant="outline" asChild>
              <Link href={bookingPath} target="_blank">
                Open booking page <ExternalLink />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s schedule</CardTitle>
            <CardDescription>All times in {tz.replaceAll("_", " ")}</CardDescription>
          </CardHeader>
          <CardContent>
            {todays.length === 0 ? (
              <EmptyState
                icon={<Clock />}
                title="Nothing scheduled today"
                description="New bookings from your public page show up here instantly."
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {todays.map((b) => {
                  const next = b.id === nextUpId;
                  return (
                    <li
                      key={b.id}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                        next && "border-primary/50 bg-accent/60",
                      )}
                    >
                      <span className="w-[4.5rem] shrink-0 tabular-nums">
                        <span className="block text-sm font-semibold">
                          {formatTime(b.startsAt, tz)}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          {formatTime(b.endsAt, tz)}
                        </span>
                      </span>
                      <span
                        className="h-8 w-1 rounded-full"
                        style={{ backgroundColor: b.staffColor }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{b.customerName}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {b.serviceName} · {b.staffName}
                        </p>
                      </div>
                      {next ? <Badge>Up next</Badge> : null}
                      <BookingStatusBadge status={b.status} />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coming up</CardTitle>
            <CardDescription>Next two weeks</CardDescription>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No upcoming bookings yet. Share your booking page to get started.
              </p>
            ) : (
              <div className="flex flex-col gap-5">
                {[...groups].map(([day, items]) => (
                  <div key={day}>
                    <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                      {day}
                    </p>
                    <ul className="flex flex-col gap-3">
                      {items.map((b) => (
                        <li key={b.id} className="flex items-center gap-3">
                          <Avatar name={b.customerName} color={b.staffColor} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{b.customerName}</p>
                            <p className="text-muted-foreground truncate text-xs">
                              {b.serviceName} · {b.staffName}
                            </p>
                          </div>
                          <span className="text-sm font-medium tabular-nums">
                            {formatTime(b.startsAt, tz)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
