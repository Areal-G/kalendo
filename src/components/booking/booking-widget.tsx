"use client";

import {
  ArrowLeft,
  CalendarDays,
  CalendarX2,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Globe2,
  Loader2,
  Lock,
  Moon,
  Sun,
  Sunrise,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Temporal } from "temporal-polyfill";

import { useBrowserTimeZone } from "@/components/use-browser-time-zone";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Avatar } from "@/components/ui/misc";
import { groupByLocalDate } from "@/lib/availability/display";
import { cn } from "@/lib/utils";

interface StaffOption {
  id: string;
  name: string;
  color: string;
}

interface ServiceOption {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  depositCents: number;
  staff: StaffOption[];
}

interface ApiSlot {
  start: string;
  end: string;
  staffIds: string[];
}

const WINDOW_DAYS = 14;

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function duration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** 12-hour clock time ("3:15 PM") of an instant in a zone. */
function clock(ms: number, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(ms);
}

/** Hour of day (0-23) of an instant in a zone, for Morning/Afternoon/Evening grouping. */
function hourIn(ms: number, timeZone: string) {
  return Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone }).format(ms),
  );
}

const PERIODS = [
  { key: "morning", label: "Morning", icon: Sunrise, test: (h: number) => h < 12 },
  { key: "afternoon", label: "Afternoon", icon: Sun, test: (h: number) => h >= 12 && h < 17 },
  { key: "evening", label: "Evening", icon: Moon, test: (h: number) => h >= 17 },
] as const;

export function BookingWidget({
  orgSlug,
  orgTimeZone,
  currency,
  services,
}: {
  orgSlug: string;
  orgTimeZone: string;
  currency: string;
  services: ServiceOption[];
}) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState<string | null>(
    services.length === 1 ? services[0]!.id : null,
  );
  const [staffId, setStaffId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<{ key: string; slots: ApiSlot[] } | null>(null);
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [selected, setSelected] = useState<ApiSlot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  /** What the customer typed, kept across a slot conflict so they don't retype it. */
  const [draft, setDraft] = useState<Record<string, string>>({});
  const viewerZone = useBrowserTimeZone(orgTimeZone);
  const [useOrgZone, setUseOrgZone] = useState(false);
  const timeRef = useRef<HTMLElement>(null);
  const detailsRef = useRef<HTMLElement>(null);

  const displayZone = useOrgZone ? orgTimeZone : viewerZone;
  // Browsers report CLDR-canonical ids ("America/Buenos_Aires") while the org may
  // store the IANA alias ("America/Argentina/Buenos_Aires"): compare canonical forms.
  const zonesDiffer = canonicalZone(viewerZone) !== canonicalZone(orgTimeZone);
  const service = services.find((s) => s.id === serviceId) ?? null;

  const range = useMemo(() => {
    const from = Temporal.Now.plainDateISO(orgTimeZone).add({ days: offset });
    return { from: from.toString(), to: from.add({ days: WINDOW_DAYS - 1 }).toString() };
  }, [offset, orgTimeZone]);

  const queryKey = serviceId
    ? `${serviceId}|${staffId ?? "any"}|${range.from}|${range.to}|${reloadCount}`
    : null;

  useEffect(() => {
    if (!serviceId || !queryKey) return;
    const controller = new AbortController();
    const q = new URLSearchParams({ serviceId, from: range.from, to: range.to });
    if (staffId) q.set("staffId", staffId);
    fetch(`/api/public/${orgSlug}/availability?${q}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error?.message ?? "Couldn't load availability");
        setResult({ key: queryKey, slots: body.slots });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        toast.error(err instanceof Error ? err.message : "Couldn't load availability");
        setResult({ key: queryKey, slots: [] });
      });
    return () => controller.abort();
  }, [orgSlug, queryKey, range, serviceId, staffId]);

  // Stale results (from a previous service/staff/week) are never shown.
  const slots = result && result.key === queryKey ? result.slots : null;
  const loading = Boolean(serviceId) && slots === null;

  // Group by calendar day *in the zone the visitor is reading*, not the org's.
  const days = useMemo(
    () =>
      groupByLocalDate(
        (slots ?? []).map((s) => ({ ...s, iso: s.start, start: Date.parse(s.start) })),
        displayZone,
      ),
    [slots, displayZone],
  );
  const selectedDate = days.some((d) => d.date === pickedDate)
    ? pickedDate
    : (days[0]?.date ?? null);
  const daySlots = days.find((d) => d.date === selectedDate)?.items ?? [];
  const periods = PERIODS.map((p) => ({
    ...p,
    items: daySlots.filter((s) => p.test(hourIn(s.start, displayZone))),
  })).filter((p) => p.items.length > 0);

  const step = !service ? 1 : !selected ? 2 : 3;
  const staffName = staffId
    ? service?.staff.find((m) => m.id === staffId)?.name
    : selected && service
      ? service.staff.find((m) => m.id === selected.staffIds[0])?.name
      : null;
  const monthLabel = selectedDate
    ? Temporal.PlainDate.from(selectedDate).toLocaleString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  function resetSelection() {
    setSelected(null);
    setPickedDate(null);
  }

  function scrollTo(ref: React.RefObject<HTMLElement | null>) {
    // Wait a frame so the section exists before scrolling to it.
    requestAnimationFrame(() =>
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  async function submit(fd: FormData) {
    if (!service || !selected) return;
    const values = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]));
    setDraft(values);
    setSubmitting(true);
    setFieldErrors({});
    try {
      const res = await fetch(`/api/public/${orgSlug}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          staffId,
          start: selected.start,
          customerTimeZone: viewerZone,
          customer: { name: values.name, email: values.email, phone: values.phone || undefined },
          notes: values.notes || undefined,
          website: values.website || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        const code = body.error?.code;
        if (code === "SLOT_UNAVAILABLE") {
          // Someone else won the race between viewing and confirming. Explain,
          // refresh availability, and keep what the customer already typed.
          toast.error("That time was just booked by someone else. Please pick another one.");
          setSelected(null);
          setReloadCount((n) => n + 1);
          scrollTo(timeRef);
          return;
        }
        if (code === "VALIDATION") setFieldErrors(body.error.fieldErrors ?? {});
        toast.error(body.error?.message ?? "Booking failed. Please try again.");
        return;
      }
      if (body.checkoutUrl) {
        window.location.assign(body.checkoutUrl);
        return;
      }
      router.push(`/b/${orgSlug}/bookings/${body.accessToken}?new=1`);
    } finally {
      setSubmitting(false);
    }
  }

  if (services.length === 0) {
    return (
      <div className="bg-card rounded-2xl border p-12 text-center shadow-sm">
        <CalendarX2 className="text-muted-foreground mx-auto mb-3 size-6" />
        <p className="font-medium">Online booking isn&apos;t open yet</p>
        <p className="text-muted-foreground mt-1 text-sm">Please check back soon.</p>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* grid-cols-1 (minmax(0,1fr)), not the implicit auto track: an auto
          track grows to its widest child's min-content (the date strip), which
          pushed the steps under the summary on desktop and past the screen
          edge on phones. */}
      <div className="grid min-w-0 grid-cols-1 gap-5">
        <Stepper step={step} />

        {/* Step 1: service */}
        <section
          className="bg-card rounded-2xl border p-5 shadow-sm sm:p-6"
          aria-labelledby="step-service"
        >
          <StepTitle n={1} id="step-service" done={step > 1}>
            Choose a service
          </StepTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {services.map((s) => {
              const active = serviceId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setServiceId(s.id);
                    setStaffId(null);
                    setOffset(0);
                    resetSelection();
                    scrollTo(timeRef);
                  }}
                  aria-pressed={active}
                  className={cn(
                    "group relative flex flex-col rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md",
                    active
                      ? "border-highlight bg-accent/50 ring-highlight/30 ring-2"
                      : "hover:border-primary/40",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-4 right-4 grid size-5 place-items-center rounded-full border transition-colors",
                      active ? "bg-brand border-transparent text-white" : "bg-background",
                    )}
                  >
                    {active ? <Check className="size-3" strokeWidth={3} /> : null}
                  </span>
                  <p className="pr-8 font-semibold">{s.name}</p>
                  {s.description ? (
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                      {s.description}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <span className="bg-muted inline-flex items-center gap-1 rounded-full px-2.5 py-1">
                      <Clock className="size-3" /> {duration(s.durationMinutes)}
                    </span>
                    {s.depositCents > 0 ? (
                      <span className="bg-accent text-accent-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-1">
                        <CreditCard className="size-3" /> {money(s.depositCents, currency)} deposit
                      </span>
                    ) : null}
                    <span className="ml-auto text-base font-semibold tabular-nums">
                      {money(s.priceCents, currency)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 2: staff, date and time */}
        {service ? (
          <section
            ref={timeRef}
            className="bg-card scroll-mt-6 rounded-2xl border p-5 shadow-sm sm:p-6"
            aria-labelledby="step-time"
          >
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <StepTitle n={2} id="step-time" done={step > 2} className="mb-0">
                Pick a time
              </StepTitle>
              {zonesDiffer ? (
                <button
                  type="button"
                  onClick={() => setUseOrgZone((v) => !v)}
                  className="hover:bg-muted inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs"
                >
                  <Globe2 className="size-3.5" />
                  {useOrgZone ? "Business" : "Your"} time · {displayZone.replaceAll("_", " ")}
                  <span className="text-highlight font-medium">Switch</span>
                </button>
              ) : (
                <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                  <Globe2 className="size-3.5" /> {displayZone.replaceAll("_", " ")}
                </span>
              )}
            </div>

            {service.staff.length > 1 ? (
              <div className="mb-6">
                <p className="text-muted-foreground mb-2 text-xs font-medium">With</p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Staff">
                  <StaffChip
                    active={staffId === null}
                    onClick={() => {
                      setStaffId(null);
                      resetSelection();
                    }}
                    label="Anyone available"
                  />
                  {service.staff.map((m) => (
                    <StaffChip
                      key={m.id}
                      active={staffId === m.id}
                      onClick={() => {
                        setStaffId(m.id);
                        resetSelection();
                      }}
                      label={m.name}
                      color={m.color}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{monthLabel ?? "Dates"}</p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  aria-label="Earlier dates"
                  disabled={offset === 0 || loading}
                  onClick={() => {
                    setOffset((o) => Math.max(0, o - WINDOW_DAYS));
                    resetSelection();
                  }}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  aria-label="Later dates"
                  disabled={loading}
                  onClick={() => {
                    setOffset((o) => o + WINDOW_DAYS);
                    resetSelection();
                  }}
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>

            <div
              className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pt-1 pb-2"
              role="tablist"
              aria-label="Dates"
            >
              {loading && !slots ? (
                Array.from({ length: 7 }, (_, i) => (
                  <div
                    key={i}
                    className="bg-muted h-[76px] w-16 shrink-0 animate-pulse rounded-xl"
                  />
                ))
              ) : days.length === 0 ? (
                <div className="text-muted-foreground flex w-full flex-col items-center gap-2 rounded-xl border border-dashed py-8 text-sm">
                  <CalendarDays className="size-5" />
                  No openings in these two weeks.
                  <button
                    type="button"
                    className="text-highlight font-medium hover:underline"
                    onClick={() => setOffset((o) => o + WINDOW_DAYS)}
                  >
                    Check the next two weeks
                  </button>
                </div>
              ) : (
                days.map((d) => {
                  const date = Temporal.PlainDate.from(d.date);
                  const js = new Date(Date.UTC(date.year, date.month - 1, date.day));
                  const active = selectedDate === d.date;
                  return (
                    <button
                      key={d.date}
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        setPickedDate(d.date);
                        setSelected(null);
                      }}
                      className={cn(
                        "flex w-16 shrink-0 flex-col items-center rounded-xl border px-2 py-2.5 text-sm transition-colors",
                        active
                          ? "bg-brand border-transparent text-white shadow-md"
                          : "hover:border-primary/40 hover:bg-muted/60",
                      )}
                    >
                      <span className="text-[11px] font-medium uppercase opacity-75">
                        {js.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}
                      </span>
                      <span className="text-xl leading-7 font-semibold">{date.day}</span>
                      <span
                        className={cn(
                          "text-[10px]",
                          active ? "text-white/80" : "text-highlight font-medium",
                        )}
                      >
                        {d.items.length} open
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="grid gap-5" aria-live="polite">
              {periods.map(({ key, label, icon: Icon, items }) => (
                <div key={key}>
                  <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium">
                    <Icon className="size-3.5" /> {label}
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                    {items.map((s) => {
                      const active = selected?.start === s.iso;
                      return (
                        <button
                          key={s.iso}
                          type="button"
                          data-testid="slot"
                          onClick={() => {
                            setSelected({ start: s.iso, end: s.end, staffIds: s.staffIds });
                            scrollTo(detailsRef);
                          }}
                          className={cn(
                            "rounded-full border py-2 text-sm font-medium tabular-nums transition-all",
                            active
                              ? "bg-brand border-transparent text-white shadow-md"
                              : "hover:border-highlight hover:text-highlight",
                          )}
                        >
                          {clock(s.start, displayZone)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Step 3: details */}
        {service && selected ? (
          <section
            ref={detailsRef}
            className="bg-card scroll-mt-6 rounded-2xl border p-5 shadow-sm sm:p-6"
            aria-labelledby="step-details"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <StepTitle n={3} id="step-details" className="mb-0">
                Your details
              </StepTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelected(null);
                  scrollTo(timeRef);
                }}
              >
                <ArrowLeft /> Change time
              </Button>
            </div>
            <form action={submit} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" htmlFor="name" error={fieldErrors["customer.name"]}>
                  <Input
                    id="name"
                    name="name"
                    autoComplete="name"
                    required
                    minLength={2}
                    placeholder="Jane Smith"
                    defaultValue={draft.name}
                  />
                </Field>
                <Field label="Email" htmlFor="email" error={fieldErrors["customer.email"]}>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="jane@example.com"
                    defaultValue={draft.email}
                  />
                </Field>
              </div>
              <Field label="Phone (optional)" htmlFor="phone" error={fieldErrors["customer.phone"]}>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+1 (555) 010-0000"
                  defaultValue={draft.phone}
                />
              </Field>
              <Field label="Anything we should know? (optional)" htmlFor="notes">
                <Textarea
                  id="notes"
                  name="notes"
                  maxLength={1000}
                  placeholder="Allergies, preferences, first visit..."
                  defaultValue={draft.notes}
                />
              </Field>
              {/* Honeypot: hidden from humans, irresistible to naive bots. */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden
                className="hidden"
              />
              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" /> Booking...
                  </>
                ) : service.depositCents > 0 ? (
                  `Continue to pay ${money(service.depositCents, currency)} deposit`
                ) : (
                  <>
                    <Check /> Confirm booking
                  </>
                )}
              </Button>
              <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs">
                <Lock className="size-3" />
                {service.depositCents > 0
                  ? "Secure checkout. The rest is paid at your appointment."
                  : "Free to book. Cancel online from your confirmation email."}
              </p>
            </form>
          </section>
        ) : null}
      </div>

      <Summary
        service={service}
        staffName={staffName ?? null}
        selected={selected}
        displayZone={displayZone}
        currency={currency}
      />
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const labels = ["Service", "Time", "Details"];
  return (
    <ol className="flex items-center gap-2 text-xs font-medium sm:text-sm" aria-label="Progress">
      {labels.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const current = step === n;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full border text-xs transition-colors",
                done && "bg-brand border-transparent text-white",
                current && "border-highlight text-highlight ring-highlight/20 ring-4",
                !done && !current && "text-muted-foreground",
              )}
              aria-current={current ? "step" : undefined}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : n}
            </span>
            <span className={cn(!current && !done && "text-muted-foreground")}>{label}</span>
            {n < labels.length ? (
              <span className={cn("h-px flex-1", done ? "bg-highlight" : "bg-border")} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function StepTitle({
  n,
  id,
  done,
  className,
  children,
}: {
  n: number;
  id: string;
  done?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h2 id={id} className={cn("mb-4 flex items-center gap-2.5 text-base font-semibold", className)}>
      <span
        className={cn(
          "grid size-6 place-items-center rounded-full text-xs",
          done ? "bg-brand text-white" : "bg-accent text-accent-foreground",
        )}
      >
        {done ? <Check className="size-3" strokeWidth={3} /> : n}
      </span>
      {children}
    </h2>
  );
}

function Summary({
  service,
  staffName,
  selected,
  displayZone,
  currency,
}: {
  service: ServiceOption | null;
  staffName: string | null;
  selected: ApiSlot | null;
  displayZone: string;
  currency: string;
}) {
  const when = selected
    ? new Date(selected.start).toLocaleString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: displayZone,
      })
    : null;
  const time = selected
    ? `${clock(Date.parse(selected.start), displayZone)} - ${clock(Date.parse(selected.end), displayZone)}`
    : null;

  return (
    <aside className="bg-card rounded-2xl border shadow-sm lg:sticky lg:top-6">
      <div className="border-b px-5 py-4">
        <p className="text-sm font-semibold">Your booking</p>
      </div>
      {service ? (
        <div className="grid gap-4 px-5 py-4 text-sm">
          <SummaryRow icon={<CalendarDays />} label="Service">
            <span className="font-medium">{service.name}</span>
            <span className="text-muted-foreground block text-xs">
              {duration(service.durationMinutes)}
            </span>
          </SummaryRow>
          <SummaryRow icon={<UserRound />} label="With">
            {staffName ?? <span className="text-muted-foreground">Anyone available</span>}
          </SummaryRow>
          <SummaryRow icon={<Clock />} label="When">
            {when ? (
              <>
                <span className="font-medium">{when}</span>
                <span className="text-muted-foreground block text-xs">{time}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Pick a time</span>
            )}
          </SummaryRow>
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="text-lg font-semibold tabular-nums">
                {money(service.priceCents, currency)}
              </span>
            </div>
            {service.depositCents > 0 ? (
              <div className="bg-accent text-accent-foreground mt-3 flex items-center justify-between rounded-lg px-3 py-2 text-xs">
                <span>Due today (deposit)</span>
                <span className="font-semibold tabular-nums">
                  {money(service.depositCents, currency)}
                </span>
              </div>
            ) : (
              <p className="text-muted-foreground mt-1 text-xs">Pay at your appointment.</p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground px-5 py-6 text-sm">Choose a service to get started.</p>
      )}
    </aside>
  );
}

function SummaryRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="text-highlight mt-0.5 [&_svg]:size-4">{icon}</span>
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">{label}</p>
        <div>{children}</div>
      </div>
    </div>
  );
}

function canonicalZone(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone }).resolvedOptions().timeZone;
  } catch {
    return timeZone;
  }
}

function StaffChip({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border py-1.5 pr-4 pl-1.5 text-sm transition-colors",
        active ? "border-highlight bg-accent ring-highlight/25 ring-2" : "hover:bg-muted",
        !color && "pl-4",
      )}
    >
      {color ? <Avatar name={label} color={color} className="size-7 text-[10px]" /> : null}
      {label}
    </button>
  );
}
