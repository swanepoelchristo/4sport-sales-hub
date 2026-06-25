import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CalendarCheck, CheckCircle2, Clock, PackageCheck, UserRoundCheck } from "lucide-react";

export const Route = createFileRoute("/_app/booking-engine")({ component: BookingEnginePage });

type DecisionCheck = {
  label: string;
  status: "pass" | "review" | "fail";
  detail: string;
};

const DECISION_CHECKS: DecisionCheck[] = [
  {
    label: "Client card found",
    status: "pass",
    detail: "Sarah Smith found by WhatsApp number. Last colour formula available.",
  },
  {
    label: "Service identified",
    status: "pass",
    detail: "Message maps to Cut & Colour for short hair.",
  },
  {
    label: "Duration fit",
    status: "review",
    detail: "Estimated 150 minutes. Tomorrow morning has a possible 09:00 slot, but it needs stylist confirmation.",
  },
  {
    label: "Product planning",
    status: "pass",
    detail: "Uses previous root tint profile: 60 g colour + 90 g activator estimate.",
  },
  {
    label: "Stock confidence",
    status: "review",
    detail: "Stock is assumed available in MVP. Real stock check comes after inventory table exists.",
  },
  {
    label: "WhatsApp cost window",
    status: "pass",
    detail: "Customer initiated the chat, so reply is inside the 24-hour service window.",
  },
];

function BookingEnginePage() {
  const passCount = DECISION_CHECKS.filter((check) => check.status === "pass").length;
  const reviewCount = DECISION_CHECKS.filter((check) => check.status === "review").length;
  const failCount = DECISION_CHECKS.filter((check) => check.status === "fail").length;

  return (
    <div className="relative left-1/2 w-[min(1280px,calc(100vw-2rem))] -translate-x-1/2 space-y-6 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-cyan-300/80">
            Booking Engine
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Booking Decision Cockpit
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            The assistant should not blindly book. It checks client history, service rules, time, stock confidence and WhatsApp window before suggesting a reply.
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-100 shadow-lg shadow-cyan-950/30">
          Mode: human approval first
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MiniStat icon={<CheckCircle2 className="h-5 w-5" />} label="Passed checks" value={String(passCount)} hint="Safe signals" />
        <MiniStat icon={<AlertTriangle className="h-5 w-5" />} label="Needs review" value={String(reviewCount)} hint="Stylist confirms" />
        <MiniStat icon={<Clock className="h-5 w-5" />} label="Estimated time" value="150 min" hint="Cut + colour" />
        <MiniStat icon={<PackageCheck className="h-5 w-5" />} label="Stock mode" value="Planned" hint="Real stock later" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-950">Incoming booking request</h2>
              <p className="text-sm text-slate-600">This request can come from WhatsApp, phone notes, or manual entry.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm font-black text-slate-950">Sarah Smith</p>
              <p className="mt-1 text-xs text-slate-500">WhatsApp · +27 82 000 0000 · returning client</p>
              <p className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm leading-6 text-slate-700">
                Hi Adele, can you fit me in tomorrow morning for a cut and colour? Short hair, same as last time.
              </p>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <InfoPill label="Requested service" value="Cut & Colour" />
              <InfoPill label="Hair profile" value="Short hair" />
              <InfoPill label="Preferred time" value="Tomorrow morning" />
              <InfoPill label="Client history" value="Previous formula found" />
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-slate-950">
              <UserRoundCheck className="h-4 w-4 text-cyan-700" />
              <h3 className="text-sm font-black">Client card context</h3>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <InfoPill label="Last service" value="Root tint + cut" />
              <InfoPill label="Last formula" value="60 g colour + 90 g activator" />
              <InfoPill label="Developer" value="20 volume" />
              <InfoPill label="Processing" value="35 min" />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25">
          <div className="mb-4">
            <h2 className="font-display text-lg font-semibold text-slate-950">Decision checks</h2>
            <p className="text-sm text-slate-600">The booking engine should explain why it recommends booking, review or escalation.</p>
          </div>

          <div className="space-y-3">
            {DECISION_CHECKS.map((check) => (
              <DecisionRow key={check.label} check={check} />
            ))}
          </div>

          <div className="mt-5 rounded-3xl border border-cyan-100 bg-cyan-50 p-4">
            <p className="text-sm font-black text-cyan-950">AI recommendation</p>
            <p className="mt-2 text-sm leading-6 text-cyan-950">
              Do not auto-book yet. Offer Sarah the 09:00 option and ask Adele to confirm the colour timing because this service can run longer depending on consultation.
            </p>
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-950">Suggested WhatsApp reply</h2>
            <p className="text-sm text-slate-600">Draft first. Human approval before sending until trust is earned.</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-black ${failCount ? "bg-red-50 text-red-700" : reviewCount ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
            {failCount ? "Do not book" : reviewCount ? "Review before booking" : "Safe to book"}
          </span>
        </div>

        <textarea
          className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 outline-none ring-cyan-200 transition focus:border-cyan-400 focus:ring-4"
          defaultValue="Hi Sarah 👋 I can help with that. I have a possible 09:00 slot tomorrow morning for your cut and colour. Let me quickly confirm the timing with Adele because your colour service depends on the consultation, then I’ll confirm the booking for you."
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300">
            Send draft
          </button>
          <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
            Ask stylist to approve
          </button>
          <button className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
            Create booking request
          </button>
        </div>
      </section>
    </div>
  );
}

function MiniStat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">{icon}</div>
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function DecisionRow({ check }: { check: DecisionCheck }) {
  const tone = check.status === "pass" ? "bg-emerald-50 text-emerald-700" : check.status === "review" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700";
  const label = check.status === "pass" ? "Pass" : check.status === "review" ? "Review" : "Fail";

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-slate-950">{check.label}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{check.detail}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${tone}`}>{label}</span>
      </div>
    </div>
  );
}
