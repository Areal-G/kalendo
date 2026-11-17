import {
  ArrowRight,
  BellRing,
  CalendarCheck2,
  Check,
  CreditCard,
  Globe2,
  Link2,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { DemoSignInButton } from "@/components/demo/demo-sign-in-button";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "#features", label: "Features" },
  { href: "#booking-page", label: "Booking page" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

const segments = [
  "Hair & beauty salons",
  "Physio clinics",
  "Barbershops",
  "Wellness studios",
  "Tattoo studios",
  "Personal trainers",
];

const features = [
  {
    icon: CalendarCheck2,
    title: "Zero double bookings",
    body: "Every slot is locked the moment it's taken. Two customers can never land in the same chair.",
  },
  {
    icon: CreditCard,
    title: "Deposits that cut no-shows",
    body: "Ask for a deposit at booking. Unpaid holds release themselves, so your calendar stays honest.",
  },
  {
    icon: BellRing,
    title: "Reminders on autopilot",
    body: "Confirmations and reminders go out by email automatically, with a one-click cancel link.",
  },
  {
    icon: Users,
    title: "Built for teams",
    body: "Owners, admins and staff, each with the right access. Split shifts, breaks and holidays included.",
  },
  {
    icon: Globe2,
    title: "Time zones handled",
    body: "Your hours stay in your zone, customers see theirs. Daylight saving never shifts an appointment.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    body: "Each business's data is walled off at the database level, and sensitive actions are audit-logged.",
  },
];

const steps = [
  {
    title: "Set up in minutes",
    body: "Add your services, prices and team hours. No training session required.",
  },
  {
    title: "Share your booking link",
    body: "Put it on Instagram, Google or your website. Customers book 24/7 without calling.",
  },
  {
    title: "Show up to a full calendar",
    body: "Bookings, deposits and reminders run themselves. You focus on your clients.",
  },
];

// Placeholder prices: nothing in the app enforces plans or bills these amounts yet.
const plans = [
  {
    name: "Starter",
    price: "$0",
    cadence: "forever",
    blurb: "For solo pros getting started with online booking.",
    items: [
      "1 team member",
      "Public booking page",
      "Email confirmations",
      "Up to 100 bookings / month",
    ],
    featured: false,
  },
  {
    name: "Pro",
    price: "$29",
    cadence: "per month",
    blurb: "For growing businesses that want fewer no-shows.",
    items: [
      "Unlimited staff and services",
      "Deposits at booking",
      "Automated reminders",
      "Customer history and notes",
      "Audit log",
    ],
    featured: true,
  },
];

const faqs = [
  {
    q: "Do my customers need an account to book?",
    a: "No. They pick a service, a time and enter their details. They get a confirmation email with a link to cancel if plans change.",
  },
  {
    q: "How do deposits work?",
    a: "You choose a deposit amount per service. The slot is held while the customer pays at checkout, and released automatically if they don't.",
  },
  {
    q: "Can my staff have their own logins?",
    a: "Yes. Invite them by email as staff or admin. Staff see their own calendar; owners and admins manage everything.",
  },
  {
    q: "Can I try it before signing up?",
    a: "Yes. The demo signs you straight into a sample salon with real-looking bookings, customers and team, so you can click through everything.",
  },
];

function TryDemo({
  size = "lg",
  label = "Try the demo",
}: {
  size?: "sm" | "default" | "lg";
  label?: string;
}) {
  return <DemoSignInButton size={size}>{label}</DemoSignInButton>;
}

/** Section heading in the reference style: typewriter title, quiet sans subtitle. */
function SectionTitle({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="px-6 py-14 text-center sm:px-10">
      <p className="text-highlight text-xs font-semibold tracking-[0.18em] uppercase">{eyebrow}</p>
      <h2 className="mt-3 font-mono text-3xl font-light text-balance sm:text-4xl">{title}</h2>
      {body ? (
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-[15px] text-pretty">
          {body}
        </p>
      ) : null}
    </div>
  );
}

/** Static product preview for the hero, drawn with the app's own tokens. */
function ProductPreview() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const strong = "bg-accent border-highlight text-accent-foreground";
  const soft = "bg-muted border-primary/50 text-foreground";
  const blocks = [
    { day: 0, top: 8, h: 22, tone: strong, label: "Haircut · Ana" },
    { day: 1, top: 30, h: 30, tone: soft, label: "Color · Inés" },
    { day: 2, top: 4, h: 18, tone: strong, label: "Trim · Leo" },
    { day: 2, top: 52, h: 26, tone: soft, label: "Manicure · Sofi" },
    { day: 3, top: 20, h: 34, tone: strong, label: "Color · Marta" },
    { day: 4, top: 10, h: 20, tone: soft, label: "Trim · Diego" },
    { day: 4, top: 60, h: 22, tone: strong, label: "Style · Uri" },
  ];
  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <div className="bg-card rounded-xl border shadow-[0_12px_40px_-12px_rgb(74_44_29/0.18)]">
        <div className="flex items-center gap-1.5 border-b px-4 py-2.5">
          <span className="bg-border size-2.5 rounded-full" />
          <span className="bg-border size-2.5 rounded-full" />
          <span className="bg-border size-2.5 rounded-full" />
          <span className="text-muted-foreground ml-3 font-mono text-xs">calendar / this-week</span>
        </div>
        <div className="grid grid-cols-[repeat(5,minmax(0,1fr))] gap-2 p-4 sm:gap-3">
          {days.map((d, i) => (
            <div key={d}>
              <p className="text-muted-foreground mb-2 text-center text-xs font-medium">{d}</p>
              <div className="bg-hatch relative h-52 rounded-md border">
                {blocks
                  .filter((b) => b.day === i)
                  .map((b) => (
                    <div
                      key={b.label}
                      className={`absolute inset-x-1 overflow-hidden rounded-sm border-l-2 px-1.5 py-1 text-[10px] leading-tight font-medium sm:text-xs ${b.tone}`}
                      style={{ top: `${b.top}%`, height: `${b.h}%` }}
                    >
                      {b.label}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-card absolute -bottom-5 left-3 hidden items-center gap-3 rounded-full border py-2 pr-5 pl-2 shadow-md sm:flex">
        <span className="bg-brand grid size-8 place-items-center rounded-full text-white">
          <CreditCard className="size-4" />
        </span>
        <div className="text-left">
          <p className="text-sm font-semibold">Deposit paid</p>
          <p className="text-muted-foreground text-xs">$30.00 · Color &amp; Gloss</p>
        </div>
      </div>
      <div className="bg-card absolute -top-5 right-3 hidden items-center gap-3 rounded-full border py-2 pr-5 pl-2 shadow-md sm:flex">
        <span className="bg-accent text-highlight grid size-8 place-items-center rounded-full">
          <BellRing className="size-4" />
        </span>
        <div className="text-left">
          <p className="text-sm font-semibold">Reminder sent</p>
          <p className="text-muted-foreground text-xs">Tomorrow 10:30 · Ana C.</p>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const year = new Date().getFullYear();
  return (
    <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
      {/* Left rail on desktop, top bar on mobile. */}
      <aside className="bg-background/95 sticky top-0 z-40 flex items-center justify-between gap-4 border-b px-4 py-3 backdrop-blur lg:h-dvh lg:flex-col lg:items-stretch lg:justify-start lg:border-r lg:border-b-0 lg:px-5 lg:py-6">
        <Logo />
        <nav className="hidden flex-col gap-0.5 lg:mt-10 lg:flex">
          {nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-foreground/80 hover:bg-muted hover:text-foreground rounded-md px-2 py-1.5 text-sm transition-colors"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2 lg:mt-auto lg:grid">
          <Button variant="outline" size="sm" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <TryDemo size="sm" />
        </div>
      </aside>

      <div className="bg-hatch min-w-0">
        <div className="bg-background mx-auto max-w-[1120px] border-x">
          {/* Thin brand line + announcement, as in the reference. */}
          <div className="bg-brand h-1" />
          <a
            href="#booking-page"
            className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 border-b bg-[linear-gradient(90deg,transparent,rgb(74_44_29/0.07),transparent)] px-4 py-2 text-center text-xs transition-colors"
          >
            <span className="text-highlight font-semibold">New</span>
            Deposits now release unpaid holds automatically
            <ArrowRight className="size-3" />
          </a>

          <main>
            {/* Hero */}
            <section className="border-b px-6 pt-16 pb-20 text-center sm:px-10 sm:pt-24">
              <h1 className="text-highlight font-mono text-4xl leading-tight font-light text-balance sm:text-5xl">
                Online booking for
                <br />
                salons, clinics & studios
                <span className="text-foreground mt-2 block text-3xl sm:text-4xl">
                  Fill your calendar, not your inbox.
                </span>
              </h1>
              <p className="text-muted-foreground mx-auto mt-7 max-w-2xl font-mono text-base leading-7 text-pretty sm:text-[17px]">
                Kalendo gives your business a booking page customers love, a shared team calendar,
                deposits that stop no-shows and reminders that send themselves.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <TryDemo />
                <Button size="lg" variant="outline" asChild>
                  <a href="#features">See how it works</a>
                </Button>
              </div>
              <p className="text-muted-foreground mt-4 text-xs">
                No sign-up needed for the demo. Explore a fully stocked sample business in one
                click.
              </p>
              <div className="mt-16">
                <ProductPreview />
              </div>
            </section>

            {/* Segments */}
            <section className="border-b px-6 py-8">
              <ul className="flex flex-wrap items-center justify-center gap-2">
                {segments.map((s) => (
                  <li
                    key={s}
                    className="rounded-full border px-3.5 py-1 text-xs font-medium shadow-[0_1px_2px_rgb(0_0_0/0.04)]"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </section>

            {/* Features: bordered cell grid */}
            <section id="features" className="scroll-mt-16 border-b">
              <SectionTitle
                eyebrow="Core advantages"
                title="The front desk that never takes a day off"
                body="Replace the phone tag, paper diary and spreadsheet with one tool your whole team can rely on."
              />
              <div className="bg-border grid gap-px border-t sm:grid-cols-2 lg:grid-cols-3">
                {features.map(({ icon: Icon, title, body }) => (
                  <div
                    key={title}
                    className="bg-background hover:bg-muted/60 p-7 transition-colors"
                  >
                    <Icon className="text-highlight size-5" />
                    <h3 className="mt-4 text-[15px] font-semibold">{title}</h3>
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{body}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Booking page spotlight */}
            <section id="booking-page" className="grid scroll-mt-16 border-b lg:grid-cols-2">
              <div className="p-8 sm:p-12 lg:border-r">
                <p className="text-highlight text-xs font-semibold tracking-[0.18em] uppercase">
                  Your booking page
                </p>
                <h2 className="mt-3 font-mono text-3xl font-light text-balance">
                  A link customers can book from in under a minute
                </h2>
                <p className="text-muted-foreground mt-4 text-[15px] text-pretty">
                  Customers choose a service, a team member and a time, shown in their own time
                  zone. If a deposit is required, they pay right there and get an instant
                  confirmation.
                </p>
                <ul className="mt-6 space-y-3 text-sm">
                  {[
                    "Works on any phone, no app to download",
                    "Only shows times that are genuinely free",
                    "Self-service cancel link in every confirmation",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check className="text-highlight mt-0.5 size-4 shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-hatch flex items-center justify-center p-8 sm:p-12">
                <div className="bg-card w-full max-w-sm rounded-xl border p-5 shadow-[0_12px_40px_-12px_rgb(74_44_29/0.2)]">
                  <div className="text-muted-foreground flex items-center gap-2 font-mono text-xs">
                    <Link2 className="size-3.5" /> kalendo.app/b/your-studio
                  </div>
                  <p className="mt-4 font-semibold">Color &amp; Gloss</p>
                  <p className="text-muted-foreground text-sm">120 min · $140 · $30 deposit</p>
                  <div className="mt-5 grid grid-cols-4 gap-2">
                    {["9:00", "10:30", "11:15", "13:00", "14:30", "15:15", "16:00", "17:30"].map(
                      (t, i) => (
                        <span
                          key={t}
                          className={`rounded-full border py-1.5 text-center text-xs font-medium ${
                            i === 4 ? "bg-brand border-transparent text-white" : "bg-background"
                          }`}
                        >
                          {t}
                        </span>
                      ),
                    )}
                  </div>
                  <div className="bg-brand mt-5 rounded-full py-2.5 text-center text-sm font-medium text-white">
                    Book 14:30 and pay deposit
                  </div>
                </div>
              </div>
            </section>

            {/* How it works */}
            <section id="how-it-works" className="scroll-mt-16 border-b">
              <SectionTitle eyebrow="How it works" title="Live in an afternoon" />
              <ol className="grid border-t md:grid-cols-3">
                {steps.map((s, i) => (
                  <li
                    key={s.title}
                    className="border-b p-7 last:border-b-0 md:border-r md:border-b-0 md:last:border-r-0"
                  >
                    <span className="text-highlight font-mono text-3xl font-light">0{i + 1}</span>
                    <h3 className="mt-3 text-[15px] font-semibold">{s.title}</h3>
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{s.body}</p>
                  </li>
                ))}
              </ol>
            </section>

            {/* Pricing */}
            <section id="pricing" className="scroll-mt-16 border-b">
              <SectionTitle
                eyebrow="Pricing"
                title="Simple plans that grow with you"
                body="Start free. Upgrade when your team does."
              />
              <div className="grid border-t md:grid-cols-2">
                {plans.map((p) => (
                  <div
                    key={p.name}
                    className={`relative flex flex-col border-b p-8 last:border-b-0 sm:p-10 md:border-b-0 md:first:border-r ${
                      p.featured ? "bg-accent/40" : ""
                    }`}
                  >
                    {p.featured ? (
                      <span className="bg-brand absolute top-8 right-8 rounded-full px-3 py-0.5 text-xs font-medium text-white">
                        Most popular
                      </span>
                    ) : null}
                    <h3 className="font-semibold">{p.name}</h3>
                    <p className="text-muted-foreground mt-1 text-sm">{p.blurb}</p>
                    <p className="mt-6 flex items-baseline gap-1.5">
                      <span className="font-mono text-4xl font-light">{p.price}</span>
                      <span className="text-muted-foreground text-sm">{p.cadence}</span>
                    </p>
                    <ul className="mt-6 flex-1 space-y-3 text-sm">
                      {p.items.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <Check className="text-highlight mt-0.5 size-4 shrink-0" /> {item}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="mt-8 w-full"
                      variant={p.featured ? "default" : "outline"}
                      asChild
                    >
                      <Link href="/sign-up">{p.featured ? "Start with Pro" : "Start free"}</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="scroll-mt-16 border-b">
              <SectionTitle eyebrow="FAQ" title="Questions, answered" />
              <div className="divide-y border-t">
                {faqs.map((f) => (
                  <details
                    key={f.q}
                    className="group px-7 py-5 sm:px-10 [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium">
                      {f.q}
                      <span className="text-highlight text-xl leading-none transition-transform group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>

            {/* Final CTA */}
            <section className="bg-brand relative overflow-hidden px-6 py-20 text-center text-white">
              <h2 className="font-mono text-3xl font-light text-balance sm:text-4xl">
                See your week fill up, not your phone log
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-[15px] text-white/80">
                Click through a sample business with real-looking bookings, customers and team. No
                sign-up, no credit card.
              </p>
              <div className="mt-8 flex justify-center">
                <DemoSignInButton size="lg" variant="outline" className="text-foreground">
                  Try the demo
                </DemoSignInButton>
              </div>
            </section>
          </main>

          <footer>
            <div className="grid gap-10 px-8 py-12 sm:grid-cols-2 sm:px-10 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <Logo />
                <p className="text-muted-foreground mt-3 max-w-xs text-sm">
                  Online booking, team calendars and deposits for appointment-based businesses.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold">Product</p>
                <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
                  {nav.map((n) => (
                    <li key={n.href}>
                      <a className="hover:text-foreground" href={n.href}>
                        {n.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold">Account</p>
                <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
                  <li>
                    <Link className="hover:text-foreground" href="/sign-in">
                      Sign in
                    </Link>
                  </li>
                  <li>
                    <Link className="hover:text-foreground" href="/sign-up">
                      Create an account
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="text-muted-foreground border-t py-5 text-center text-xs">
              © {year} Kalendo. All rights reserved.
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
