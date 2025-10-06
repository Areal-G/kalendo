"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { CalendarClock, CreditCard, Mail, Scissors, StickyNote, UserRound, X } from "lucide-react";
import Link from "next/link";
import type * as React from "react";

import { BookingStatusBadge } from "@/components/dashboard/booking-status";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/misc";
import type { BookingStatus } from "@/db/schema";

/** Everything the panel shows, pre-formatted on the server in the org's zone. */
export interface PeekBooking {
  id: string;
  status: BookingStatus;
  customerId: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  staffName: string;
  staffColor: string;
  dateLabel: string;
  timeLabel: string;
  durationLabel: string;
  priceLabel: string;
  depositLabel: string | null;
  notes: string | null;
  source: string;
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 py-3">
      <span className="text-muted-foreground mt-0.5 [&_svg]:size-4">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs">{label}</p>
        <div className="mt-0.5 text-sm">{children}</div>
      </div>
    </div>
  );
}

/**
 * A calendar block that opens a slide-over with the booking's details instead
 * of navigating away from the calendar.
 */
export function BookingPeek({
  orgSlug,
  booking: b,
  className,
  style,
  children,
}: {
  orgSlug: string;
  booking: PeekBooking;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          className={className}
          style={style}
          title={`${b.customerName} · ${b.serviceName}`}
        >
          {children}
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="animate-fade-in fixed inset-0 z-50 bg-black/25" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="bg-card animate-sheet-in fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l shadow-2xl outline-none"
        >
          <div className="h-1.5 shrink-0" style={{ backgroundColor: b.staffColor }} />
          <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
            <div className="min-w-0">
              <BookingStatusBadge status={b.status} />
              <DialogPrimitive.Title className="mt-2 truncate text-lg font-semibold">
                {b.serviceName}
              </DialogPrimitive.Title>
              <p className="text-muted-foreground text-sm">
                {b.dateLabel} · {b.timeLabel}
              </p>
            </div>
            <DialogPrimitive.Close
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-full p-1.5"
              aria-label="Close"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 divide-y overflow-y-auto px-5">
            <div className="flex items-center gap-3 py-4">
              <Avatar name={b.customerName} color={b.staffColor} className="size-10" />
              <div className="min-w-0">
                <p className="truncate font-medium">{b.customerName}</p>
                <a
                  href={`mailto:${b.customerEmail}`}
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 truncate text-xs"
                >
                  <Mail className="size-3" /> {b.customerEmail}
                </a>
              </div>
            </div>
            <Row icon={<CalendarClock />} label="When">
              {b.dateLabel}, {b.timeLabel}{" "}
              <span className="text-muted-foreground">({b.durationLabel})</span>
            </Row>
            <Row icon={<Scissors />} label="Service">
              {b.serviceName}
            </Row>
            <Row icon={<UserRound />} label="With">
              <span className="inline-flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: b.staffColor }} />
                {b.staffName}
              </span>
            </Row>
            <Row icon={<CreditCard />} label="Price">
              {b.priceLabel}
              {b.depositLabel ? (
                <span className="text-muted-foreground"> · {b.depositLabel} deposit</span>
              ) : null}
            </Row>
            {b.notes ? (
              <Row icon={<StickyNote />} label="Notes">
                <p className="whitespace-pre-wrap">{b.notes}</p>
              </Row>
            ) : null}
            <p className="text-muted-foreground py-3 text-xs">Booked via {b.source}</p>
          </div>

          <div className="grid gap-2 border-t p-4">
            <Button asChild>
              <Link href={`/app/${orgSlug}/customers/${b.customerId}`}>View customer</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/app/${orgSlug}/bookings?focus=${b.id}`}>Open in bookings</Link>
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
